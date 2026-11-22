import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

test('React storefront, account, cart and checkout render with Vite JSX settings', async t => {
  const vite=await createServer({server:{middlewareMode:true,watch:null},appType:'custom'});
  t.after(()=>vite.close());
  const {default:App}=await vite.ssrLoadModule('/src/App.jsx');
  const {AccountPage}=await vite.ssrLoadModule('/src/Account.jsx');
  const original=globalThis.location;
  try {
    for(const [hash,text] of [['#shop','Good tech.'],['#cart','Shopping cart'],['#checkout','Make it yours'],['#account','Loading your account']]) {
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
  } finally { if(original===undefined) delete globalThis.location; else globalThis.location=original; }
});
