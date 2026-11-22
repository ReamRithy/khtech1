import React from 'react';
import { CheckCircle2, ShoppingBag, Truck } from 'lucide-react';
import { money, shippingMethods } from './store';
import ProductArt from './ProductArt';

export default function OrderConfirmation({ order, onContinue }) {
  const method = shippingMethods.find(item => item.id === order.shipping);
  return (
    <section className="confirmation">
      <div className="confirmation-icon"><CheckCircle2 size={35}/></div>
      <h1>Order Placed Successfully!</h1>
      <p>Thank you, {order.customer.customer_name}. Your order has been saved.</p>
      <div className="confirmation-meta">
        <div><small>Order ID</small><strong>{order.id}</strong></div>
        <div><small>Customer name</small><strong>{order.customer.customer_name}</strong></div>
        <div><small>Order date</small><strong>{new Date(order.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Phnom_Penh' })}</strong></div>
        <div><small>Order status</small><strong className="status">{order.status}</strong></div>
      </div>
      <div className="confirmation-details">
        <section>
          <h2>Ordered products</h2>
          {order.items.map(product => <div className="ordered-product" key={product.id}>
            <div className={`summary-art ${product.color}`}><ProductArt type={product.art || product.id}/></div>
            <span>{product.name}<small>{product.quantity} × {money(product.price)}</small></span>
            <strong>{money(product.quantity * product.price)}</strong>
          </div>)}
          <div className="summary-line"><span>Subtotal</span><span>{money(order.subtotal)}</span></div>
          <div className="summary-line"><span>Shipping</span><span>{order.delivery ? money(order.delivery) : 'Free'}</span></div>
          <div className="summary-total"><span>Total amount</span><strong>{money(order.total)}</strong></div>
        </section>
        <section className="delivery-details">
          <h2>Customer details</h2>
          <strong>{order.customer.customer_name}</strong>
          <p className="address">{order.customer.address}</p>
          <p>{order.customer.email}<br/>{order.customer.phone}</p>
          <div className="delivery-method"><Truck size={19}/><span>{method?.name}<small>{method?.detail}</small></span></div>
          <p className="local-note">Order saved. No payment was collected.</p>
        </section>
      </div>
      <button className="button primary" onClick={onContinue}>Continue shopping <ShoppingBag size={17}/></button>
    </section>
  );
}
