export const products = [
  { id: 'laptop', name: 'Laptop', category: 'Computers', price: 650, label: 'Your everyday powerhouse', description: 'A slim, dependable companion for work, study, and everything in between.', color: 'sage', badge: 'Bestseller' },
  { id: 'mouse', name: 'Mouse', category: 'Accessories', price: 15, label: 'Small detail. Big difference.', description: 'Comfortable, precise control that keeps your day moving.', color: 'sand' },
  { id: 'keyboard', name: 'Keyboard', category: 'Accessories', price: 25, label: 'Find your flow', description: 'A clean, full-size layout with a satisfying feel for every keystroke.', color: 'lavender' },
  { id: 'monitor', name: 'Monitor', category: 'Displays', price: 120, label: 'Make room for more', description: 'A crisp, spacious display that brings your workspace together.', color: 'blue', badge: 'Workspace pick' },
].map((product, index) => ({ ...product, product_id: index + 1, stock_quantity: 99 }));
export const defaultCategories = [...new Set(products.map(product => product.category))].map((category_name, index) => ({ category_id: index + 1, category_name }));
// The exercise price list stays visible while the database connection loads.
export const catalogProducts = products.map(product => ({ ...product, id: String(product.product_id), art: product.id }));
export const shippingMethods = [{ id: 'standard', name: 'Standard delivery', detail: '3–5 business days', price: 0 }, { id: 'express', name: 'Express delivery', detail: '1–2 business days', price: 10 }];
export const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
export function setQuantity(cart, id, value, catalog = products) {
  const product = catalog.find(product => product.id === id);
  if (!product) return cart;
  const qty = Math.max(0, Math.min(99, product.stock_quantity, Math.trunc(Number(value) || 0)));
  const next = { ...cart };
  if (qty) next[id] = qty; else delete next[id];
  return next;
}
export function cartItems(cart, catalog = products) { return catalog.filter(p => cart[p.id] > 0).map(p => ({ ...p, quantity: cart[p.id] })); }
export function totals(cart, shipping = 'standard', catalog = products) {
  const items = cartItems(cart, catalog);
  const subtotal = items.reduce((sum, p) => sum + Math.round(p.price * 100) * p.quantity, 0) / 100;
  const delivery = items.length ? (shippingMethods.find(m => m.id === shipping)?.price ?? 0) : 0;
  return { subtotal, delivery, total: subtotal + delivery, count: items.reduce((sum, p) => sum + p.quantity, 0) };
}
export function validateCustomer(customer) {
  const errors = {};
  for (const [field, label] of Object.entries({ firstName: 'First name', lastName: 'Last name', email: 'Email', phone: 'Phone number', address: 'Address' })) {
    if (!customer[field]?.trim()) errors[field] = `${label} is required.`;
  }
  if (customer.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email.trim())) errors.email = 'Enter a valid email address.';
  if (customer.phone?.trim() && !/^[+()\d\s.-]{7,25}$/.test(customer.phone.trim())) errors.phone = 'Enter a valid phone number.';
  return errors;
}
export function customerDetails(form) {
  return {
    customer_name: `${form.firstName.trim()} ${form.lastName.trim()}`,
    email: form.email.trim(), phone: form.phone.trim(), address: form.address.trim(),
  };
}
export function customerForm(profile) {
  const [firstName = '', ...lastName] = (profile.customer_name || '').trim().split(/\s+/);
  return { firstName, lastName: lastName.join(' '), email: profile.email || '', phone: profile.phone || '', address: profile.address || '' };
}
export function readSaved(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
export function save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } }
