import test from 'node:test';
import assert from 'node:assert/strict';
import { products, setQuantity, totals, cartItems, validateCustomer, customerDetails, customerForm } from '../src/store.js';

test('exercise products and prices match the brief', () => {
  assert.deepEqual(products.map(({name,price})=>[name,price]), [['Laptop',650],['Mouse',15],['Keyboard',25],['Monitor',120]]);
});
test('cart quantity changes, deletion, limits and unknown products', () => {
  let cart=setQuantity({},'laptop',2);
  cart=setQuantity(cart,'mouse',3);
  assert.deepEqual(totals(cart),{subtotal:1345,delivery:0,total:1345,count:5});
  cart=setQuantity(cart,'laptop',0);
  assert.equal(cartItems(cart).length,1);
  assert.equal(totals(cart).total,45);
  assert.equal(setQuantity(cart,'mouse',100).mouse,99);
  assert.deepEqual(setQuantity(cart,'unknown',2),cart);
  assert.deepEqual(setQuantity(cart,'mouse',-2),{});
});
test('shipping is included once and empty carts never incur delivery', () => {
  const cart=Object.fromEntries(products.map(p=>[p.id,1]));
  assert.equal(totals(cart).total,810);
  assert.equal(totals(cart,'express').total,820);
  assert.equal(totals({},'express').total,0);
});
test('checkout rejects missing or invalid customer details', () => {
  assert.equal(Object.keys(validateCustomer({})).length,5);
  const valid={firstName:'Sok',lastName:'Dara',email:'dara@example.com',phone:'+855 12 345 678',address:'Phnom Penh'};
  assert.deepEqual(validateCustomer(valid),{});
  assert.ok(validateCustomer({...valid,email:'invalid'}).email);
  assert.ok(validateCustomer({...valid,phone:'abc'}).phone);
  assert.ok(validateCustomer({...valid,firstName:'  '}).firstName);
  assert.ok(validateCustomer({...valid,lastName:'  '}).lastName);
});

test('PDF first and last names map to the ERD customer_name field', () => {
  const form={firstName:' Sok ',lastName:' Dara ',email:' dara@example.com ',phone:' 012345678 ',address:' Phnom Penh '};
  const details=customerDetails(form);
  assert.deepEqual(details,{customer_name:'Sok Dara',email:'dara@example.com',phone:'012345678',address:'Phnom Penh'});
  assert.deepEqual(customerForm(details),{firstName:'Sok',lastName:'Dara',email:'dara@example.com',phone:'012345678',address:'Phnom Penh'});
});

test('cart obeys database stock limits, including sold-out products', () => {
  const catalog=[{id:'1',price:650,stock_quantity:2},{id:'2',price:15,stock_quantity:0}];
  assert.deepEqual(setQuantity({},'1',5,catalog),{'1':2});
  assert.deepEqual(setQuantity({},'2',1,catalog),{});
  assert.equal(totals({'1':2},'express',catalog).total,1310);
});
