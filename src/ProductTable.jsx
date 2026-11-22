import React from 'react';
import { Plus } from 'lucide-react';
import './product-table.css';

const priceLabel = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 2 });

export default function ProductTable({ products, cart, onAdd }) {
  return (
    <section className="catalog-section" id="collection" aria-label="Products">
      <h1 className="sr-only">Products</h1>
      <table className="exercise-product-table">
        <caption className="sr-only">Product price list</caption>
        <colgroup><col className="product-column"/><col/></colgroup>
        <thead><tr><th scope="col">Product</th><th scope="col">Price</th></tr></thead>
        <tbody>
          {products.map(product => {
            const quantity = cart[product.id] || 0;
            const maximum = Math.min(99, product.stock_quantity);
            const disabled = quantity >= maximum;
            return (
              <tr key={product.id}>
                <th scope="row">{product.name}</th>
                <td><div className="table-price-cell">
                  <span>{priceLabel.format(product.price)}</span>
                  <button className="table-add-button" onClick={() => onAdd(product)} disabled={disabled} aria-label={`Add ${product.name} to cart`}>
                    <Plus size={16}/><span>{!product.stock_quantity ? 'Out of stock' : disabled ? 'Maximum added' : 'Add to cart'}</span>
                    {quantity > 0 && <small>({quantity})</small>}
                  </button>
                </div></td>
              </tr>
            );
          })}
          {!products.length && <tr><td colSpan="2" className="empty-table">No products in this category.</td></tr>}
        </tbody>
      </table>
    </section>
  );
}
