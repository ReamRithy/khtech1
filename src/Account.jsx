import React, { useEffect, useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { api, orderView } from './api';
import { money } from './store';
import './account.css';

export function AccountPage({ customer, onOpenOrder }) {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    if (!customer) { setLoading(false); return; }
    setLoading(true);
    api('/orders').then(rows => { if (!cancelled) { setOrders(rows.map(orderView)); setError(''); } }).catch(error => { if (!cancelled) setError(error.message); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [customer?.customer_id]);
  if (!customer) return <section className="empty-cart"><ShoppingBag size={35}/><h2>Your orders will appear here</h2><p>Place an order with your checkout details. No account is needed.</p><a className="button primary" href="#shop">Explore the collection</a></section>;
  return <section className="account-page"><div className="flow-title"><p className="eyebrow">YOUR EVERYDAY, ALL IN ONE PLACE</p><h1>Hello, {customer.customer_name}<span>.</span></h1><p>Customer #{customer.customer_id} · {customer.email}</p></div><div className="account-profile"><div><strong>{customer.customer_name}</strong><p>{customer.phone}</p><p>{customer.address}</p></div></div><h2>Your orders</h2>{error && <p className="request-error" role="alert">{error}</p>}{loading ? <p className="store-message" role="status">Loading your orders…</p> : orders.length ? <div className="order-history">{orders.map(order => <article key={order.order_id}><div><strong>{order.id}</strong><small>{new Date(order.date).toLocaleDateString('en-GB', { timeZone: 'Asia/Phnom_Penh' })}</small></div><span>{order.items.reduce((sum,item) => sum + item.quantity, 0)} items</span><strong>{money(order.total)}</strong><span className="order-status">{order.status}</span><button className="button secondary" onClick={() => onOpenOrder(order)}>View order</button></article>)}</div> : !error && <div className="empty-cart"><ShoppingBag size={32}/><h2>Your first order is waiting</h2><p>Find the essentials that work for you.</p><a className="button primary" href="#shop">Explore the collection</a></div>}</section>;
}
