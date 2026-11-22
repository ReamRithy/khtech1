export const products = [
  { id: 'laptop', name: 'Laptop', collection: 'The everyday powerhouse', category: 'Computers', price: 650, color: 'Space gray', badge: 'Bestseller', rating: '4.9', reviews: 128, description: 'Big ideas deserve a little power. A slim, beautifully balanced laptop for work, study, and everything in between.', specs: ['15.6-inch Full HD display', '8 GB memory · 256 GB SSD', 'Lightweight aluminum design'], tone: 'sage' },
  { id: 'mouse', name: 'Mouse', collection: 'Less effort. More flow.', category: 'Accessories', price: 15, color: 'Graphite', badge: '', rating: '4.8', reviews: 86, description: 'Find your flow with a comfortable wireless mouse made for all-day scrolling, clicking, and creating.', specs: ['Wireless connectivity', 'Quiet, precise clicks', 'Comfortable sculpted shape'], tone: 'peach' },
  { id: 'keyboard', name: 'Keyboard', collection: 'Make every keystroke count', category: 'Accessories', price: 25, color: 'Cloud white', badge: 'Fan favorite', rating: '4.9', reviews: 94, description: 'A cleaner desk and a satisfying feel. Meet the compact keyboard that makes getting things done feel good.', specs: ['Compact desktop layout', 'Soft-touch keycaps', 'Plug-and-play USB connection'], tone: 'lavender' },
  { id: 'monitor', name: 'Monitor', collection: 'Room for a bigger picture', category: 'Displays', price: 120, color: 'Silver', badge: '', rating: '4.8', reviews: 62, description: 'Open up your workspace with crisp detail, rich color, and a display designed to keep you focused.', specs: ['24-inch Full HD display', 'Slim bezel design', 'Adjustable viewing angle'], tone: 'blue' },
];

export const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);
export function normalizeCart(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(products.filter(p => Number.isInteger(value[p.id]) && value[p.id] > 0).map(p => [p.id, Math.min(value[p.id], 99)]));
}
export function cartLines(cart) { return products.filter(p => cart[p.id]).map(p => ({ ...p, quantity: cart[p.id] })); }
export function totals(cart, method = 'standard') {
  const lines = cartLines(normalizeCart(cart));
  const subtotal = lines.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal && method === 'express' ? 10 : 0;
  return { count: lines.reduce((sum, item) => sum + item.quantity, 0), subtotal, shipping, total: subtotal + shipping };
}
export function readSaved(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
export function save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Shopping still works when storage is unavailable. */ } }
