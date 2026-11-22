import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { openStore } from '../server/database.js';
import { createApp } from '../server/app.js';
import { createServer as createViteServer } from 'vite';
import viteConfig from '../vite.config.js';

test('HTTP flow authenticates, saves orders, isolates customers, and prevents overselling', async t => {
  const store=openStore(':memory:');
  const server=createApp(store);
  server.listen(0,'127.0.0.1'); await once(server,'listening');
  t.after(async()=>{server.closeAllConnections(); await new Promise(resolve=>server.close(resolve)); store.close();});
  const base=`http://127.0.0.1:${server.address().port}`;
  const vite=await createViteServer({configFile:false,server:{...viteConfig.server,host:'127.0.0.1',port:0,watch:null,proxy:{'/api':{...viteConfig.server.proxy['/api'],target:base}}}});
  await vite.listen();
  t.after(()=>vite.close());
  const proxyBase=`http://127.0.0.1:${vite.httpServer.address().port}`;
  const proxied=await fetch(proxyBase+'/api/checkout',{method:'POST',headers:{'Content-Type':'application/json',Origin:proxyBase},body:JSON.stringify({customer:{customer_name:'Proxy Test',email:'proxy@example.com',phone:'012345678',address:'Test address'},shipping:'standard',items:[{product_id:2,quantity:1}]})});
  assert.equal(proxied.status,201,'guest checkout through the actual Vite proxy must work');
  assert.equal((await proxied.json()).customer.email,'proxy@example.com');
  async function request(path,{cookie,body,method=body?'POST':'GET',origin}={}) {
    const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),...(origin?{Origin:origin}:{})},body:body?JSON.stringify(body):undefined});
    return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0],headers:response.headers};
  }
  const profile={customer_name:'API Test',email:'api@example.com',password:'test-password-123',phone:'012345678',address:'Test address'};
  assert.equal((await request('/api/products')).data.length,4);
  assert.equal((await request('/api/orders')).status,401);
  assert.equal((await request('/api/register',{body:profile,origin:'https://unrelated.example'})).status,403);
  const registration=await request('/api/register',{body:profile,origin:base});
  assert.equal(registration.status,201);
  assert.match(registration.headers.get('set-cookie'),/HttpOnly; SameSite=Strict/);
  assert.equal(registration.data.customer.password,undefined);
  const cookie=registration.cookie;
  assert.equal((await request('/api/me',{cookie})).data.customer.email,profile.email);
  const purchase={customer:profile,shipping:'standard',items:[{product_id:1,quantity:1}]};
  const order=await request('/api/orders',{cookie,body:purchase});
  assert.equal(order.status,201);
  assert.equal(order.data.total_amount,650);
  assert.equal((await request('/api/orders',{cookie})).data.length,1);
  const other=await request('/api/register',{body:{...profile,email:'other@example.com'}});
  assert.equal((await request(`/api/orders/${order.data.order_id}`,{cookie:other.cookie})).status,404);
  assert.equal((await request('/api/orders',{cookie:other.cookie})).data.length,0);
  store.db.prepare('UPDATE Products SET stock_quantity=1 WHERE product_id=1').run();
  const race=await Promise.all([request('/api/orders',{cookie,body:purchase}),request('/api/orders',{cookie,body:purchase})]);
  assert.deepEqual(race.map(result=>result.status).sort(),[201,409]);
  assert.equal(store.products()[0].stock_quantity,0);
  assert.equal((await request('/api/logout',{cookie,method:'POST'})).status,200);
  assert.equal((await request('/api/orders',{cookie})).status,401);
  assert.equal((await request('/api/login',{body:{email:profile.email,password:profile.password}})).status,200);
});

test('guest checkout needs no login and isolates orders even for the same email', async t => {
  const store=openStore(':memory:');
  const server=createApp(store);
  server.listen(0,'127.0.0.1'); await once(server,'listening');
  t.after(async()=>{server.closeAllConnections(); await new Promise(resolve=>server.close(resolve)); store.close();});
  const base=`http://127.0.0.1:${server.address().port}`;
  const customer={customer_name:'Guest',email:'guest@example.com',phone:'012345678',address:'Test address'};
  const input={customer,shipping:'standard',items:[{product_id:2,quantity:1}]};
  async function checkout(body,cookie) {
    const response=await fetch(base+'/api/checkout',{method:'POST',headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)});
    return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};
  }
  const invalid=await checkout({...input,items:[{product_id:2,quantity:99}]});
  assert.equal(invalid.status,409);
  assert.equal(store.db.prepare('SELECT COUNT(*) count FROM Customers').get().count,0);
  const first=await checkout(input);
  assert.equal(first.status,201);
  assert.equal(first.data.customer.password,undefined);
  assert.equal(first.data.total_amount,15);
  const second=await checkout(input,first.cookie);
  assert.equal(second.data.customer_id,first.data.customer_id);
  const stranger=await checkout(input);
  assert.equal(stranger.status,201);
  assert.notEqual(stranger.data.customer_id,first.data.customer_id);
  const stolen=await fetch(`${base}/api/orders/${first.data.order_id}`,{headers:{Cookie:stranger.cookie}});
  assert.equal(stolen.status,404);
  const history=await fetch(base+'/api/orders',{headers:{Cookie:second.cookie}});
  assert.equal((await history.json()).length,2);
  const registered=store.register({...customer,email:'registered@example.com',password:'test-password-123'});
  const guestWithAccountEmail=await checkout({...input,customer:{...customer,email:registered.email,customer_name:'Different person'}});
  assert.equal(guestWithAccountEmail.status,201);
  assert.notEqual(guestWithAccountEmail.data.customer_id,registered.customer_id);
  assert.equal(store.customer(registered.customer_id).customer_name,customer.customer_name);
});
