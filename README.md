# KH Tech - React and SQLite e-commerce

The React website now uses a Node.js API and SQLite database matching the supplied ERD. The storefront design and animated navigation are retained.

## Run

Requires Node.js 22.18 or newer. No separate database installation is needed.

```powershell
npm.cmd install
npm.cmd run dev
```

Open http://127.0.0.1:5173. This command starts both the Vite frontend and the API on port 3001. It reuses an existing API or Vite instance when already running. Vite proxies `/api` to the backend.

The database is created automatically at `data/store.sqlite`. It is ignored by Git. Do not upload this file: it contains customer and order data.

## Shopping flow

1. Browse products from the database, filter by category, and check available stock.
2. Add products to the cart, update quantities, or remove items. Quantities cannot exceed stock or 99.
3. Enter customer name, email, phone, and address at checkout. No login, registration, or password is required.
4. Confirm customer details and choose free standard or $10 express shipping.
5. Place an order. The server recalculates prices, checks stock, creates an Orders record and its Order_Items records, and deducts stock in one transaction.
6. View confirmation and open My orders to see orders belonging to your current browser session.

Only the cart and the most recent order ID are saved in browser localStorage. Customer details, products, stock, orders, and order items are saved in SQLite. Guest checkout creates a customer record without a password. An HttpOnly, SameSite=Strict cookie limits order history to the current browser session, which expires after 12 hours or an API restart. Orders remain in the database after the session expires, but the website does not offer recovery of expired guest sessions.

Customers using the same email in different browser sessions are separate records. Entering an email never grants access to someone else's orders. Existing customer records and orders are preserved during the automatic guest-checkout schema upgrade.

This is a local exercise app. Checkout saves orders but does not charge payments or send email. Before external hosting, use HTTPS and `COOKIE_SECURE=1`; the server intentionally listens on loopback by default.

## Database

- [Schema](database/schema.sql): the exact five entities and field names from the supplied image, with keys and constraints.
- [Seed data](database/seed.sql): three categories and the four exercise products, inserted without resetting existing data.
- [ERD and field semantics](database/ERD.md): relationships, historical item prices, and shipping calculations.

The ERD links order details to the current customer profile and current product name; it has no historical address or product-name snapshot fields. Order item prices are preserved independently.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | /api/categories | Read categories and descriptions |
| GET | /api/products | Read products, categories, prices, and stock |
| GET | /api/me | Current browser-session customer without password |
| POST | /api/checkout | Save guest customer details and create an order without login |
| GET | /api/orders | Current browser-session customer's order history |
| GET | /api/orders/:id | One order belonging to the browser-session customer |

The server uses prepared SQL statements, same-origin checks, and a request-size limit. Existing account passwords remain hashed; the removed login and registration forms are not part of the shopping flow. It never trusts client-supplied prices or customer IDs for authorization.

## Verify and production build

```powershell
npm.cmd test
npm.cmd run build
npm.cmd start
```

The production website and API are served together at http://127.0.0.1:3001. Serving only `dist/` without the Node API does not provide accounts or checkout. Use `npm.cmd run server` for the API separately, and set `PORT` or `DB_PATH` to override its port or database location.

Tests cover the ERD fields, foreign keys, password hashing, sign-in, order ownership, server-side pricing, stock races, rollback, persistence after reopening the database, cart calculations, navigation rendering, and React view rendering.
