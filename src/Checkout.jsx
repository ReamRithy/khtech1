import React from 'react';
import { Truck, ShoppingBag } from 'lucide-react';
import { money, shippingMethods } from './store';

const fields = [
  { key: 'firstName', label: 'First name', autoComplete: 'given-name' },
  { key: 'lastName', label: 'Last name', autoComplete: 'family-name' },
  { key: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
  { key: 'phone', label: 'Phone number', type: 'tel', autoComplete: 'tel' },
  { key: 'address', label: 'Address', autoComplete: 'street-address' },
];

export default function Checkout({ customer, onCustomerChange, errors, shipping, onShippingChange, total, backendReady, loading, submitting, orderError, onSubmit, children }) {
  return (
    <form className="checkout-layout" onSubmit={onSubmit} noValidate>
      <div className="checkout-form">
        <section className="form-section">
          <h2>Shipping address</h2>
          <div className="fields">
            {fields.map(field => {
              const props = {
                id: field.key, name: field.key, autoComplete: field.autoComplete,
                value: customer[field.key] || '', required: true,
                onChange: event => onCustomerChange({ ...customer, [field.key]: event.target.value }),
                'aria-invalid': !!errors[field.key],
                'aria-describedby': errors[field.key] ? `${field.key}-error` : undefined,
              };
              return <div className={`field ${field.key === 'address' ? 'wide' : ''}`} key={field.key}>
                <label htmlFor={field.key}>{field.label} <span>*</span></label>
                {field.key === 'address'
                  ? <textarea {...props} rows="3" maxLength={500}/>
                  : <input {...props} type={field.type || 'text'} maxLength={field.key === 'phone' ? 25 : 200}/>}
                {errors[field.key] && <small className="field-error" id={`${field.key}-error`}>{errors[field.key]}</small>}
              </div>;
            })}
          </div>
        </section>
        <section className="form-section">
          <h2>Shipping method</h2>
          <div className="shipping-options">
            {shippingMethods.map(method => <label className={shipping === method.id ? 'checked' : ''} key={method.id}>
              <input type="radio" name="shipping" value={method.id} checked={shipping === method.id} onChange={() => onShippingChange(method.id)}/>
              <Truck size={21}/>
              <span><strong>{method.name}</strong><small>{method.detail}</small></span>
              <b>{method.price ? money(method.price) : 'Free'}</b>
            </label>)}
          </div>
        </section>
        {!backendReady && <p className="checkout-availability" role="status">
          {loading ? 'Connecting to the store…' : 'Ordering is temporarily unavailable. Your cart is saved; please reconnect to continue.'}
        </p>}
        {orderError && <p className="request-error" role="alert">{orderError}</p>}
        <button className="button primary full place-order" type="submit" disabled={submitting || !backendReady}>
          {submitting ? 'Placing order…' : 'Place Order'} · {money(total)}<ShoppingBag size={18}/>
        </button>
        <p className="checkout-payment-note">No payment is collected for this exercise.</p>
        <a className="continue-shopping" href="#cart">Back to shopping cart</a>
      </div>
      {children}
    </form>
  );
}
