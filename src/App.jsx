import React, { useEffect, useRef, useState } from 'react';
import { ShoppingBag, Plus, Minus, X, Check, Truck, ShieldCheck, Package, Headphones, ChevronRight, Search, Grid2X2, LayoutList, Laptop, Mouse, Keyboard, Monitor, CheckCircle2, CreditCard, Leaf } from 'lucide-react';
import { defaultCategories, shippingMethods, money, setQuantity, cartItems, totals, validateCustomer, readSaved, save } from './store';
import { api, productView, orderView } from './api';
import { AccountPage } from './Account';
import './styles.css';
import MainNavigation from './MainNavigation';

function ProductArt({ type, hero = false }) {
  return <div className={`product-art ${type} ${hero ? 'hero-art' : ''}`} aria-hidden="true">
    {(type === 'laptop' || type === 'monitor') && <><div className="device-screen"><div className="wallpaper"><i/><i/><i/></div></div><div className="device-base"/>{type === 'monitor' && <div className="monitor-foot"/>}</>}
    {type === 'mouse' && <div className="mouse-body"><i/><span/></div>}
    {type === 'keyboard' && <div className="keyboard-body">{Array.from({length: 65}, (_, i) => <i key={i}/>)}</div>}
  </div>;
}

const icons = { Computers: Laptop, Accessories: Keyboard, Displays: Monitor };
export default function App() {
  const [page, setPage] = useState(() => ['shop','cart','checkout','confirmation','account'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'shop');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(defaultCategories);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [cart, setCart] = useState(() => { const stored = readSaved('kh-cart', {}); return stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {}; });
  const [customer, setCustomer] = useState({customer_name:'',email:'',phone:'',address:''});
  const [currentCustomer, setCurrentCustomer] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [shipping, setShipping] = useState('standard');
  const [errors, setErrors] = useState({});
  const [order, setOrder] = useState(null);
  const [category, setCategory] = useState('All products');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('featured');
  const [view, setView] = useState('grid');
  const [toast, setToast] = useState('');
  const toastTimer = useRef();
  const placing = useRef(false);
  const summary = totals(cart, shipping, products);
  const items = cartItems(cart, products);
  async function loadProducts() {
    setLoading(true); setLoadError('');
    try {
      const [productRows, categoryRows] = await Promise.all([api('/products'), api('/categories')]);
      const catalog = productRows.map(productView);
      setProducts(catalog); setCategories(categoryRows.length ? categoryRows : defaultCategories);
      setCart(previous => catalog.reduce((next, p) => setQuantity(next, p.id, previous[p.id] ?? previous[p.art], catalog), {}));
    } catch (error) { setLoadError(error.message); }
    finally { setLoading(false); }
  }
  function authenticated(profile) { setCurrentCustomer(profile); setCustomer(profile); setOrderError(''); }
  useEffect(() => {
    loadProducts();
    api('/me').then(({customer: profile}) => { if (profile) { authenticated(profile); const id=readSaved('kh-last-order-id', null); if (Number.isSafeInteger(id)) api(`/orders/${id}`).then(row => setOrder(orderView(row))).catch(() => {}); } }).catch(error => setLoadError(error.message)).finally(() => setSessionLoading(false));
  }, []);
  useEffect(() => { save('kh-cart',cart); }, [cart]);
  useEffect(() => { const handler=()=>{ const hash=location.hash.slice(1); if (['shop','cart','checkout','confirmation','account'].includes(hash)) { setPage(hash); setErrors({}); setOrderError(''); window.scrollTo(0,0); } }; window.addEventListener('hashchange',handler); return ()=>window.removeEventListener('hashchange',handler); }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  function navigate(target) { if (location.hash === `#${target}`) window.scrollTo(0,0); else location.hash=target; }
  function add(product) { setCart(previous=>setQuantity(previous,product.id,(previous[product.id]||0)+1,products)); setToast(`${product.name} added to your cart`); clearTimeout(toastTimer.current); toastTimer.current=setTimeout(()=>setToast(''),3000); }
  function update(id,qty) { setCart(previous=>setQuantity(previous,id,qty,products)); }
  async function placeOrder(event) {
    event.preventDefault();
    const nextErrors=validateCustomer(customer); setErrors(nextErrors);
    if(Object.keys(nextErrors).length) { requestAnimationFrame(()=>document.querySelector('[aria-invalid="true"]')?.focus()); return; }
    if (!items.length || placing.current) return;
    placing.current=true; setSubmitting(true); setOrderError('');
    try {
      const saved = await api('/checkout', { method:'POST', body:JSON.stringify({ customer, shipping, items:items.map(p=>({product_id:p.product_id,quantity:p.quantity})) }) });
      const nextOrder=orderView(saved);
      setOrder(nextOrder); save('kh-last-order-id',saved.order_id); authenticated(saved.customer); setCart({}); navigate('confirmation');
      await loadProducts();
    } catch (error) { setOrderError(error.message); if (error.status===401) setCurrentCustomer(null); if (error.status===409) await loadProducts(); }
    finally { placing.current=false; setSubmitting(false); }
  }
  let visible=products.filter(p=>(category==='All products'||p.category===category)&&`${p.name} ${p.category}`.toLowerCase().includes(query.toLowerCase()));
  if(sort==='low') visible.sort((a,b)=>a.price-b.price); if(sort==='high') visible.sort((a,b)=>b.price-a.price);
  function OrderSummary({checkout=false}) { return <aside className="order-summary"><h2>Order summary</h2>{checkout&&<div className="summary-products">{items.map(p=><div key={p.id}><div className={`summary-art ${p.color}`}><ProductArt type={p.art || p.id}/></div><span>{p.name}<small>Qty {p.quantity}</small></span><strong>{money(p.price*p.quantity)}</strong></div>)}</div>}<div className="summary-line"><span>Subtotal ({summary.count} items)</span><span>{money(summary.subtotal)}</span></div><div className="summary-line"><span>Shipping</span><span className={summary.delivery===0?'green':''}>{summary.delivery?money(summary.delivery):'Free'}</span></div><div className="summary-total"><span>Grand total</span><strong>{money(summary.total)}</strong></div>{!checkout&&<button className="button primary full" onClick={()=>navigate('checkout')}>Proceed to checkout <ShoppingBag size={17}/></button>}<p className="secure-note"><ShieldCheck size={15}/> {checkout?'Demo checkout · No payment required':'A simple, secure checkout experience'}</p></aside>; }
  function Steps() { return <div className="steps">{['Shopping cart','Checkout','Confirmation'].map((label,i)=><React.Fragment key={label}><span className={(page==='cart'?0:page==='checkout'?1:2)>=i?'active':''}><b>{(page==='cart'?0:page==='checkout'?1:2)>i?<Check size={14}/>:i+1}</b>{label}</span>{i<2&&<i/>}</React.Fragment>)}</div>; }
  return <>
    <div className="announcement"><span>Thoughtfully selected. Fairly priced.</span><span><Truck size={14}/> Free standard delivery on every order</span></div>
    <header className="site-header"><div className="header-inner"><a className="brand" href="#shop" aria-label="KH Tech home"><span className="brand-symbol"><span/><span/><span/></span>kh<span className="brand-light">tech</span><i/></a><MainNavigation categories={categories} page={page} category={category} onSelect={nextCategory=>{setCategory(nextCategory);setQuery('');}}/><div className="header-actions"><a href="#cart" className="cart-link"><ShoppingBag size={20}/><span>Cart</span><b>{summary.count}</b></a></div></div></header>
    <main>{loadError && <div className="request-error store-error" role="alert"><span>{loadError}</span><button className="button secondary" onClick={loadProducts}>Try again</button></div>}
    {page==='account' ? <div className="flow-page">{sessionLoading ? <p className="store-message" role="status">Loading your account…</p> : <AccountPage customer={currentCustomer} onOpenOrder={selected=>{setOrder(selected);save('kh-last-order-id',selected.order_id);navigate('confirmation');}}/>}</div> : page==='shop' ? <>
      <section className="hero"><div className="hero-copy"><p className="eyebrow"><span/> THE EVERYDAY COLLECTION</p><h1>Good tech.<br/>Better everyday.</h1><p>Upgrade your workspace with essentials that<br className="desktop-break"/> work as hard as you do. Simple. Reliable. Yours.</p><a className="button primary" href="#collection">Explore the collection <ShoppingBag size={17}/></a><div className="hero-note"><span className="tiny-avatars"><i>✓</i><i>✓</i><i>✓</i></span><span>Small collection. Big possibilities.</span></div></div><div className="hero-visual"><div className="hero-orbit"/><div className="hero-product"><ProductArt type="laptop" hero/></div><div className="floating-tag"><span className="tag-icon"><Check size={17}/></span><span>Everyday performance<strong>Without the extra price.</strong></span></div><div className="hero-caption"><span>THE LAPTOP</span><b>Made for your next big thing.</b><span>From $650.00</span></div><span className="hero-spark spark-one">✳</span><span className="hero-spark spark-two">✧</span></div></section>
      <section className="benefits" aria-label="Shopping benefits"><div><Truck/><span><strong>Delivery, on us</strong><small>Free standard shipping</small></span></div><div><ShieldCheck/><span><strong>Shop with confidence</strong><small>Quality you can count on</small></span></div><div><Headphones/><span><strong>Here to help</strong><small>Support for your everyday</small></span></div></section>
      <section className="collection" id="collection"><div className="section-heading"><div><p className="eyebrow">YOUR WORKSPACE, UPGRADED</p><h2>Meet your everyday essentials<span>.</span></h2></div><span className="collection-count">4 essentials. Endless potential.</span></div><div className="shop-toolbar"><div className="categories" aria-label="Product categories">{['All products',...categories.map(c=>c.category_name)].map(label=>{const Icon=icons[label]||Grid2X2; return <button key={label} className={category===label?'active':''} onClick={()=>setCategory(label)}><Icon size={16}/>{label}</button>;})}</div><div className="shop-tools"><label className="search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search essentials" aria-label="Search products"/></label><label className="sort-label"><span className="sr-only">Sort products</span><select value={sort} onChange={e=>setSort(e.target.value)}><option value="featured">Featured</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option></select></label><div className="view-toggle"><button aria-label="Grid view" aria-pressed={view==='grid'} onClick={()=>setView('grid')}><Grid2X2 size={17}/></button><button aria-label="List view" aria-pressed={view==='list'} onClick={()=>setView('list')}><LayoutList size={17}/></button></div></div></div>
      {loading && <p className="store-message" role="status">Loading essentials…</p>}<div className={`product-grid ${view==='list'?'list-view':''}`}>{visible.map(p=><article className="product-card" key={p.id}><div className={`product-image ${p.color}`}>{p.badge&&<span className="product-badge">{p.badge}</span>}<ProductArt type={p.art || p.id}/><span className="image-caption">KH / EVERYDAY ESSENTIALS</span></div><div className="product-info"><p className="product-category">{p.category}</p><div className="product-title"><h3>{p.name}</h3><strong>{money(p.price)}</strong></div><p className="product-description">{p.label}</p><p className={`stock-label ${p.stock_quantity===0?'sold-out':''}`}>{p.stock_quantity ? `${p.stock_quantity} in stock` : 'Out of stock'}</p><button className="add-button" onClick={()=>add(p)} disabled={!p.stock_quantity || (cart[p.id]||0)>=Math.min(99,p.stock_quantity)}><Plus size={17}/>{!p.stock_quantity?'Out of stock':(cart[p.id]||0)>=Math.min(99,p.stock_quantity)?'Maximum added':'Add to cart'}{cart[p.id]>0&&<span>{cart[p.id]} in cart</span>}</button></div></article>)}</div>{!loading&&!loadError&&visible.length===0&&<div className="empty-results"><Search/><h3>No essentials found</h3><p>Try a different search or category.</p><button className="button secondary" onClick={()=>{setQuery('');setCategory('All products');}}>Show all products</button></div>}
      <div className="collection-bottom"><Leaf size={18}/><p>A little less clutter. A lot more possibility.</p><span>Build a workspace that feels like you.</span></div></section>
    </> : <div className="flow-page"><div className="breadcrumb"><a href="#shop">Shop</a><ChevronRight size={14}/><span>{page==='cart'?'Shopping cart':page==='checkout'?'Checkout':'Order confirmation'}</span></div><Steps/>
      {page==='cart'&&<><div className="flow-title"><p className="eyebrow">YOUR EVERYDAY, IN THE MAKING</p><h1>Shopping cart<span>.</span></h1><p>{summary.count?`${summary.count} ${summary.count===1?'essential':'essentials'} ready for a new home.`:'Your next great workspace starts here.'}</p></div>{items.length?<div className="checkout-layout"><section className="cart-items"><div className="cart-table-heading"><span>Product</span><span>Quantity</span><span>Total</span></div>{items.map(p=><article className="cart-item" key={p.id}><div className="cart-product"><div className={`cart-art ${p.color}`}><ProductArt type={p.art || p.id}/></div><div><small>{p.category}</small><h3>{p.name}</h3><p>{money(p.price)}</p><button className="remove-link" onClick={()=>update(p.id,0)}>Remove</button></div></div><div className="quantity"><button aria-label={`Decrease ${p.name} quantity`} onClick={()=>update(p.id,p.quantity-1)}><Minus size={14}/></button><input type="number" min="0" max={Math.min(99,p.stock_quantity)} aria-label={`${p.name} quantity`} value={p.quantity} onChange={e=>update(p.id,e.target.value)}/><button aria-label={`Increase ${p.name} quantity`} disabled={p.quantity>=Math.min(99,p.stock_quantity)} onClick={()=>update(p.id,p.quantity+1)}><Plus size={14}/></button></div><strong>{money(p.price*p.quantity)}</strong></article>)}<a className="continue-shopping" href="#shop">Continue shopping</a></section><OrderSummary/></div>:<EmptyCart navigate={navigate}/>}</>}
      {page==='checkout'&&<><div className="flow-title"><p className="eyebrow">JUST A FEW MORE DETAILS</p><h1>Make it yours<span>.</span></h1><p>Let’s get your essentials on their way.</p></div>{items.length?<form className="checkout-layout" onSubmit={placeOrder} noValidate><div className="checkout-form"><section className="form-section"><h2><span>1</span> Customer details</h2><div className="fields">{Object.entries({customer_name:'Customer name',email:'Email address',phone:'Phone number',address:'Delivery address'}).map(([key,label])=><div className={`field ${key==='address'?'wide':''}`} key={key}><label htmlFor={key}>{label} <span>*</span></label>{key==='address'?<textarea id={key} rows="3" autoComplete="street-address" value={customer[key]||''} onChange={e=>setCustomer({...customer,[key]:e.target.value})} aria-invalid={!!errors[key]} aria-describedby={errors[key]?`${key}-error`:undefined} required/>:<input id={key} type={key==='email'?'email':key==='phone'?'tel':'text'} autoComplete={{customer_name:'name',email:'email',phone:'tel'}[key]} value={customer[key]||''} onChange={e=>setCustomer({...customer,[key]:e.target.value})} aria-invalid={!!errors[key]} aria-describedby={errors[key]?`${key}-error`:undefined} required/>}{errors[key]&&<small className="field-error" id={`${key}-error`}>{errors[key]}</small>}</div>)}</div></section><section className="form-section"><h2><span>2</span> Shipping method</h2><div className="shipping-options">{shippingMethods.map(m=><label className={shipping===m.id?'checked':''} key={m.id}><input type="radio" name="shipping" value={m.id} checked={shipping===m.id} onChange={()=>setShipping(m.id)}/><Truck size={21}/><span><strong>{m.name}</strong><small>{m.detail}</small></span><b>{m.price?money(m.price):'Free'}</b></label>)}</div></section><div className="demo-notice"><CreditCard size={20}/><p><strong>This is a demo checkout.</strong><span>No payment details are needed. Your order is saved. No account is needed.</span></p></div>{orderError&&<p className="request-error" role="alert">{orderError}</p>}<button className="button primary full place-order" type="submit" disabled={submitting}>{submitting ? 'Placing order…' : 'Place order'} · {money(summary.total)}<ShoppingBag size={18}/></button><a className="continue-shopping" href="#cart">Back to shopping cart</a></div><OrderSummary checkout/></form>:<EmptyCart navigate={navigate}/>}</>}
      {page==='confirmation'&&(order?<section className="confirmation"><div className="confirmation-icon"><CheckCircle2 size={35}/></div><p className="eyebrow">A GOOD DAY FOR YOUR WORKSPACE</p><h1>{readSaved('kh-last-order-id',null)===order.order_id?'Order placed successfully!':'Your order details'}</h1><p>Thank you, {order.customer.customer_name}. Your essentials are one step closer.</p><div className="confirmation-meta"><div><small>Order number</small><strong>{order.id}</strong></div><div><small>Order date</small><strong>{new Date(order.date).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Phnom_Penh'})}</strong></div><div><small>Order status</small><strong className="status">{order.status}</strong></div></div><div className="confirmation-details"><section><h2>Your essentials</h2>{order.items.map(p=><div className="ordered-product" key={p.id}><div className={`summary-art ${p.color}`}><ProductArt type={p.art || p.id}/></div><span>{p.name}<small>{p.quantity} × {money(p.price)}</small></span><strong>{money(p.quantity*p.price)}</strong></div>)}<div className="summary-line"><span>Subtotal</span><span>{money(order.subtotal)}</span></div><div className="summary-line"><span>Shipping</span><span>{order.delivery?money(order.delivery):'Free'}</span></div><div className="summary-total"><span>Total amount</span><strong>{money(order.total)}</strong></div></section><section className="delivery-details"><h2>Delivery details</h2><strong>{order.customer.customer_name} </strong><p className="address">{order.customer.address}</p><p>{order.customer.email}<br/>{order.customer.phone}</p><div className="delivery-method"><Truck size={19}/><span>{shippingMethods.find(m=>m.id===order.shipping)?.name}<small>{shippingMethods.find(m=>m.id===order.shipping)?.detail}</small></span></div><p className="local-note">Order saved. No payment was collected.</p></section></div><button className="button primary" onClick={()=>navigate('shop')}>Continue shopping <ShoppingBag size={17}/></button></section>:<EmptyCart navigate={navigate}/>)}</div>}
    </main>
    <footer><div className="footer-top"><a className="brand" href="#shop">kh<span className="brand-light">tech</span><i/></a><span>Good tech for the way you live.</span><a href="#shop">Back to the shop</a></div><div className="footer-bottom"><span>© {new Date().getFullYear()} KH Tech. Everyday, made better.</span><span><ShieldCheck size={14}/> Built with care. Powered by React.</span></div></footer>
    <div className={`toast ${toast?'visible':''}`} role="status"><CheckCircle2 size={19}/><span>{toast}</span><button aria-label="Dismiss notification" onClick={()=>setToast('')}><X size={16}/></button></div>
  </>;
}
function EmptyCart({navigate}) {return <div className="empty-cart"><div><ShoppingBag size={35}/></div><h2>Your cart is waiting</h2><p>Find the everyday essentials that work for you.</p><button className="button primary" onClick={()=>navigate('shop')}>Explore the collection</button></div>;}

