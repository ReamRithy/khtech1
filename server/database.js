import { DatabaseSync } from 'node:sqlite';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';

export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const fail = (status, message) => { throw new ApiError(status, message); };
const text = value => typeof value === 'string' ? value.trim() : '';
const publicCustomer = row => row ? Object.fromEntries(Object.entries(row).filter(([key]) => key !== 'password')) : null;
export function validateDetails(input) {
  const customer = Object.fromEntries(['customer_name', 'email', 'phone', 'address'].map(key => [key, text(input?.[key])]));
  customer.email = customer.email.toLowerCase();
  for (const value of Object.values(customer)) if (!value || value.length > 500) fail(400, 'Complete all customer fields (maximum 500 characters each).');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) fail(400, 'Enter a valid email address.');
  if (!/^[+()\d\s.-]{7,25}$/.test(customer.phone)) fail(400, 'Enter a valid phone number.');
  return customer;
}
function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return expected.length === candidate.length && timingSafeEqual(candidate, expected);
}
export function openStore(filename) {
  if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename, { timeout: 5000 });
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  // Older versions made every email unique. Guests with the same email must
  // remain separate unless they already own the current browser session.
  const oldCustomers = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='Customers'").get();
  if (oldCustomers && /email[^,]*\bUNIQUE\b/i.test(oldCustomers.sql)) {
    db.exec('PRAGMA foreign_keys = OFF; BEGIN IMMEDIATE;');
    try {
      db.exec(`CREATE TABLE Customers_guest_migration (
        customer_id INTEGER PRIMARY KEY, customer_name TEXT NOT NULL,
        email TEXT NOT NULL COLLATE NOCASE, password TEXT NOT NULL,
        phone TEXT NOT NULL, address TEXT NOT NULL
      );
      INSERT INTO Customers_guest_migration SELECT customer_id,customer_name,email,password,phone,address FROM Customers;
      DROP TABLE Customers;
      ALTER TABLE Customers_guest_migration RENAME TO Customers;`);
      if (db.prepare('PRAGMA foreign_key_check').all().length) throw new Error('Customer migration failed its relationship check.');
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
    finally { db.exec('PRAGMA foreign_keys = ON'); }
  }
  db.exec(readFileSync(new URL('../database/schema.sql', import.meta.url), 'utf8'));
  db.exec(readFileSync(new URL('../database/seed.sql', import.meta.url), 'utf8'));
  const customer = id => publicCustomer(db.prepare('SELECT * FROM Customers WHERE customer_id = ?').get(id));
  function register(input) {
    const details = validateDetails(input);
    if (typeof input.password !== 'string' || input.password.length < 8 || input.password.length > 128) fail(400, 'Use a password of 8–128 characters.');
    if (db.prepare("SELECT 1 FROM Customers WHERE email = ? AND password <> ''").get(details.email)) fail(409, 'An account with this email already exists. Sign in instead.');
    const result = db.prepare('INSERT INTO Customers (customer_name,email,password,phone,address) VALUES (?,?,?,?,?)').run(details.customer_name, details.email, hashPassword(input.password), details.phone, details.address);
    return customer(Number(result.lastInsertRowid));
  }
  function login(input) {
    const row = db.prepare("SELECT * FROM Customers WHERE email = ? AND password <> ''").get(text(input?.email).toLowerCase());
    if (!row || typeof input.password !== 'string' || input.password.length > 128 || !verifyPassword(input.password, row.password)) fail(401, 'Email or password is incorrect.');
    return publicCustomer(row);
  }
  function order(id, customerId) {
    const row = db.prepare('SELECT * FROM Orders WHERE order_id = ? AND customer_id = ?').get(id, customerId);
    if (!row) fail(404, 'Order not found.');
    const items = db.prepare('SELECT i.*, p.product_name, p.category_id, c.category_name FROM Order_Items i JOIN Products p ON p.product_id = i.product_id JOIN Categories c ON c.category_id = p.category_id WHERE i.order_id = ? ORDER BY i.order_item_id').all(id);
    return { ...row, customer: customer(customerId), items };
  }
  function placeOrder(customerId, input, { guest = false } = {}) {
    const existing = customerId ? db.prepare('SELECT * FROM Customers WHERE customer_id = ?').get(customerId) : null;
    if (!guest && !existing) fail(401, 'Please sign in to place your order.');
    const details = validateDetails(input?.customer);
    if (!guest && details.email !== existing.email) fail(400, 'Use the email address belonging to your signed-in account.');
    if (!Array.isArray(input.items) || !input.items.length || input.items.length > 100) fail(400, 'Add at least one product to your cart.');
    if (!['standard', 'express'].includes(input.shipping)) fail(400, 'Select a valid shipping method.');
    const seen = new Set();
    db.exec('BEGIN IMMEDIATE');
    try {
      let subtotalCents = 0;
      const lines = input.items.map(item => {
        if (!item || !Number.isSafeInteger(item.product_id) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99 || seen.has(item.product_id)) fail(400, 'Each product must have a unique, valid quantity between 1 and 99.');
        seen.add(item.product_id);
        const product = db.prepare('SELECT * FROM Products WHERE product_id = ?').get(item.product_id);
        if (!product) fail(400, 'A product in your cart no longer exists.');
        if (product.stock_quantity < item.quantity) fail(409, `${product.product_name} has only ${product.stock_quantity} left in stock. Please update your cart.`);
        subtotalCents += Math.round(product.price * 100) * item.quantity;
        return { ...product, quantity: item.quantity };
      });
      const total = (subtotalCents + (input.shipping === 'express' ? 1000 : 0)) / 100;
      if (guest && !(existing?.password === '' && existing.email === details.email)) {
        const created = db.prepare("INSERT INTO Customers (customer_name,email,password,phone,address) VALUES (?,?,'',?,?)").run(details.customer_name,details.email,details.phone,details.address);
        customerId = Number(created.lastInsertRowid);
      }
      db.prepare('UPDATE Customers SET customer_name = ?, phone = ?, address = ? WHERE customer_id = ?').run(details.customer_name, details.phone, details.address, customerId);
      const result = db.prepare('INSERT INTO Orders (customer_id,order_date,total_amount,status) VALUES (?,?,?,?)').run(customerId, new Date().toISOString(), total, 'Pending');
      const orderId = Number(result.lastInsertRowid);
      for (const product of lines) {
        db.prepare('INSERT INTO Order_Items (order_id,product_id,quantity,price) VALUES (?,?,?,?)').run(orderId, product.product_id, product.quantity, product.price);
        db.prepare('UPDATE Products SET stock_quantity = stock_quantity - ? WHERE product_id = ?').run(product.quantity, product.product_id);
      }
      const saved = order(orderId, customerId);
      db.exec('COMMIT');
      return saved;
    } catch (error) { db.exec('ROLLBACK'); throw error; }
  }
  return {
    db, customer, register, login, order, placeOrder,
    categories: () => db.prepare('SELECT * FROM Categories ORDER BY category_id').all(),
    products: () => db.prepare('SELECT p.*, c.category_name, c.description AS category_description FROM Products p JOIN Categories c ON c.category_id = p.category_id ORDER BY p.product_id').all(),
    orders: customerId => db.prepare('SELECT order_id FROM Orders WHERE customer_id = ? ORDER BY order_id DESC').all(customerId).map(row => order(row.order_id, customerId)),
    close: () => db.close(),
  };
}
