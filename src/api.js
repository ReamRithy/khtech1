import { products as presentation } from './store';

export async function api(path, options = {}) {
  let response;
  try { response = await fetch(`/api${path}`, { credentials: 'same-origin', ...options, headers: { 'Content-Type': 'application/json', ...options.headers } }); }
  catch { throw new Error('Cannot reach the store. Please check your connection and try again.'); }
  let data;
  try { data = await response.json(); } catch { throw new Error('The store is unavailable. Please try again shortly.'); }
  if (!response.ok) { const error = new Error(data.error || 'Request failed.'); error.status = response.status; throw error; }
  return data;
}
export function productView(product) {
  const appearance = presentation.find(p => p.product_id === product.product_id);
  return { ...appearance, ...product, id: String(product.product_id), art: appearance?.id, name: product.product_name, category: product.category_name, color: appearance?.color || 'sage', label: appearance?.label || product.category_name };
}
export function orderView(order) {
  const items = order.items.map(item => ({ ...productView(item), quantity: item.quantity }));
  const subtotal = items.reduce((sum, item) => sum + Math.round(item.price * 100) * item.quantity, 0) / 100;
  const delivery = Math.round((order.total_amount - subtotal) * 100) / 100;
  return { ...order, id: `ORD-${String(order.order_id).padStart(4, '0')}`, date: order.order_date, total: order.total_amount, subtotal, delivery, shipping: delivery > 0 ? 'express' : 'standard', items };
}
