import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, unlinkSync, rmdirSync, readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openStore } from '../server/database.js';

const details = { customer_name: 'Test Customer', email: 'test@example.com', phone: '+855 12 345 678', address: 'Test address, Phnom Penh', password: 'test-password-123' };
const purchase = items => ({ customer: details, items, shipping: 'standard' });

test('schema matches the supplied ERD field names and foreign keys', t => {
  const store=openStore(':memory:'); t.after(()=>store.close());
  const fields={Categories:['category_id','category_name','description'],Customers:['customer_id','customer_name','email','password','phone','address'],Products:['product_id','category_id','product_name','price','stock_quantity'],Orders:['order_id','customer_id','order_date','total_amount','status'],Order_Items:['order_item_id','order_id','product_id','quantity','price']};
  for(const [table,names] of Object.entries(fields)) assert.deepEqual(store.db.prepare(`PRAGMA table_info(${table})`).all().map(row=>row.name),names);
  assert.equal(store.categories().length,3);
  assert.equal(store.products().length,4);
  assert.throws(()=>store.db.prepare('INSERT INTO Products (category_id,product_name,price,stock_quantity) VALUES (999,?,?,?)').run('Invalid',1,1),/FOREIGN KEY/);
});
test('accounts store password hashes, validate input, and expose no password', t => {
  const store=openStore(':memory:'); t.after(()=>store.close());
  const customer=store.register(details);
  assert.equal(customer.customer_name,details.customer_name);
  assert.equal(customer.password,undefined);
  assert.notEqual(store.db.prepare('SELECT password FROM Customers').get().password,details.password);
  assert.equal(store.login({...details,email:'TEST@EXAMPLE.COM'}).customer_id,customer.customer_id);
  assert.throws(()=>store.login({...details,password:'incorrect'}),{status:401});
  assert.throws(()=>store.register(details),{status:409});
  assert.throws(()=>store.register({...details,email:'other@example.com',password:'short'}),{status:400});
});
test('orders use database prices, save item prices, deduct stock, and belong to a customer', t => {
  const store=openStore(':memory:'); t.after(()=>store.close());
  const customer=store.register(details);
  const order=store.placeOrder(customer.customer_id,{...purchase([{product_id:1,quantity:2,price:1},{product_id:2,quantity:3}]),shipping:'express',total_amount:1});
  assert.equal(order.total_amount,1355);
  assert.equal(order.status,'Pending');
  assert.equal(order.customer_id,customer.customer_id);
  assert.equal(order.items[0].price,650);
  assert.equal(store.products()[0].stock_quantity,13);
  assert.equal(store.products()[1].stock_quantity,47);
  store.db.prepare('UPDATE Products SET price=999 WHERE product_id=1').run();
  assert.equal(store.order(order.order_id,customer.customer_id).items[0].price,650);
  assert.equal(store.orders(customer.customer_id).length,1);
  assert.throws(()=>store.order(order.order_id,999),{status:404});
});
test('out-of-stock, invalid, and duplicate lines leave no partial records', t => {
  const store=openStore(':memory:'); t.after(()=>store.close());
  const customer=store.register(details);
  for(const items of [[],[{product_id:1,quantity:16}],[{product_id:1,quantity:1},{product_id:1,quantity:1}],[{product_id:1,quantity:-1}],[{product_id:999,quantity:1}],[null]]) {
    assert.throws(()=>store.placeOrder(customer.customer_id,purchase(items)));
    assert.equal(store.orders(customer.customer_id).length,0);
    assert.equal(store.products()[0].stock_quantity,15);
  }
});
test('failed writes roll back the order, items, profile changes, and stock', t => {
  const store=openStore(':memory:'); t.after(()=>store.close());
  const customer=store.register(details);
  store.db.exec("CREATE TRIGGER reject_second_line BEFORE INSERT ON Order_Items WHEN NEW.product_id=2 BEGIN SELECT RAISE(ABORT,'simulated failure'); END;");
  assert.throws(()=>store.placeOrder(customer.customer_id,{...purchase([{product_id:1,quantity:2},{product_id:2,quantity:1}]),customer:{...details,customer_name:'Changed'}}),/simulated failure/);
  assert.equal(store.orders(customer.customer_id).length,0);
  assert.equal(store.db.prepare('SELECT COUNT(*) count FROM Order_Items').get().count,0);
  assert.equal(store.customer(customer.customer_id).customer_name,details.customer_name);
  assert.equal(store.products()[0].stock_quantity,15);
});
test('customer and order data survive reopening the database without reseeding stock', () => {
  const directory=mkdtempSync(join(tmpdir(),'kh-tech-test-'));
  const file=join(directory,'store.sqlite');
  let store;
  try {
    store=openStore(file);
    const customer=store.register(details);
    const order=store.placeOrder(customer.customer_id,purchase([{product_id:1,quantity:1}]));
    store.close(); store=openStore(file);
    assert.equal(store.login(details).customer_id,customer.customer_id);
    assert.equal(store.order(order.order_id,customer.customer_id).total_amount,650);
    assert.equal(store.products()[0].stock_quantity,14);
  } finally {
    store?.close();
    for(const suffix of ['', '-wal', '-shm']) { try { unlinkSync(file+suffix); } catch(error) { if(error.code!=='ENOENT') throw error; } }
    rmdirSync(directory);
  }
});

test('guest schema migration preserves existing customers, orders, and relationships', () => {
  const directory=mkdtempSync(join(tmpdir(),'kh-tech-migration-'));
  const file=join(directory,'store.sqlite');
  let store;
  try {
    const oldDb=new DatabaseSync(file);
    const oldSchema=readFileSync(new URL('../database/schema.sql',import.meta.url),'utf8').replace('email TEXT NOT NULL COLLATE NOCASE,','email TEXT NOT NULL COLLATE NOCASE UNIQUE,').replace("CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_account_email ON Customers(email) WHERE password <> '';",'');
    oldDb.exec(oldSchema);
    oldDb.exec(readFileSync(new URL('../database/seed.sql',import.meta.url),'utf8'));
    oldDb.prepare('INSERT INTO Customers VALUES (42,?,?,?,?,?)').run(details.customer_name,details.email,'existing-password-hash',details.phone,details.address);
    oldDb.exec("INSERT INTO Orders VALUES (51,42,'2026-11-22T00:00:00Z',650,'Pending'); INSERT INTO Order_Items VALUES (91,51,1,1,650);");
    oldDb.close();
    store=openStore(file);
    assert.equal(store.order(51,42).items[0].order_item_id,91);
    assert.equal(store.db.prepare('SELECT password FROM Customers WHERE customer_id=42').get().password,'existing-password-hash');
    assert.deepEqual(store.db.prepare('PRAGMA foreign_key_check').all(),[]);
    const guest=store.placeOrder(null,purchase([{product_id:2,quantity:1}]),{guest:true});
    assert.notEqual(guest.customer_id,42);
    assert.equal(store.customer(42).customer_name,details.customer_name);
  } finally {
    store?.close();
    for(const suffix of ['', '-wal', '-shm']) { try { unlinkSync(file+suffix); } catch(error) { if(error.code!=='ENOENT') throw error; } }
    rmdirSync(directory);
  }
});
