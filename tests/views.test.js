import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

test('React storefront, account, cart and checkout render with Vite JSX settings', async t => {
  const vite=await createServer({optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,watch:null},appType:'custom'});
  t.after(()=>vite.close());
  const {default:App}=await vite.ssrLoadModule('/src/App.jsx');
  const {AccountPage}=await vite.ssrLoadModule('/src/Account.jsx');
  const {default:ProductTable}=await vite.ssrLoadModule('/src/ProductTable.jsx');
  const {catalogProducts}=await vite.ssrLoadModule('/src/store.js');
  const original=globalThis.location;
  const originalStorage=globalThis.localStorage;
  try {
    for(const [hash,text] of [['#shop','Product price list'],['#cart','Shopping cart'],['#checkout','Make it yours'],['#account','Loading your account']]) {
      globalThis.location={hash};
      const html=renderToStaticMarkup(React.createElement(App));
      assert.ok(html.includes(text));
      assert.doesNotMatch(html, /Sign in|Create account|type="password"/);
    }
    const emptyOrders=renderToStaticMarkup(React.createElement(AccountPage,{customer:null}));
    assert.match(emptyOrders,/No account is needed/);
    assert.doesNotMatch(emptyOrders,/<form|Sign in|type="password"/);
    const profile={customer_id:1,customer_name:'Test Customer',email:'test@example.com',phone:'012345678',address:'Test address'};
    assert.match(renderToStaticMarkup(React.createElement(AccountPage,{customer:profile})),/Test Customer/);
    globalThis.location={hash:'#shop'};
    const shop=renderToStaticMarkup(React.createElement(App));
    for(const [name,price] of [['Laptop',650],['Mouse',15],['Keyboard',25],['Monitor',120]]) {
      assert.match(shop,new RegExp(`<th scope="row">${name}</th>`));
      assert.ok(shop.includes(`<span>$${price}</span>`));
      assert.ok(shop.includes(`aria-label="Add ${name} to cart"`));
    }
    const accessories=renderToStaticMarkup(React.createElement(ProductTable,{products:catalogProducts.filter(p=>p.category==='Accessories'),cart:{},onAdd(){}}));
    assert.match(accessories,/Mouse/);
    assert.match(accessories,/Keyboard/);
    assert.doesNotMatch(accessories,/Laptop|Monitor/);
    globalThis.localStorage={getItem:key=>key==='kh-cart'?'{"1":1}':null};
    globalThis.location={hash:'#checkout'};
    const checkout=renderToStaticMarkup(React.createElement(App));
    assert.match(checkout,/Customer details/);
    assert.match(checkout,/type="submit" disabled=""/);
    assert.doesNotMatch(checkout,/Order placed successfully/);
  } finally {
    if(original===undefined) delete globalThis.location; else globalThis.location=original;
    if(originalStorage===undefined) delete globalThis.localStorage; else globalThis.localStorage=originalStorage;
  }
});
