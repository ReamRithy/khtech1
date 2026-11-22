PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS Categories (
  category_id INTEGER PRIMARY KEY,
  category_name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS Customers (
  customer_id INTEGER PRIMARY KEY,
  customer_name TEXT NOT NULL,
  email TEXT NOT NULL COLLATE NOCASE,
  password TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS Products (
  product_id INTEGER PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES Categories(category_id),
  product_name TEXT NOT NULL,
  price NUMERIC NOT NULL CHECK (price >= 0),
  stock_quantity INTEGER NOT NULL CHECK (stock_quantity >= 0 AND stock_quantity = CAST(stock_quantity AS INTEGER))
);
CREATE TABLE IF NOT EXISTS Orders (
  order_id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES Customers(customer_id),
  order_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  total_amount NUMERIC NOT NULL CHECK (total_amount >= 0),
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Processing','Shipped','Completed','Cancelled'))
);
CREATE TABLE IF NOT EXISTS Order_Items (
  order_item_id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES Orders(order_id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES Products(product_id),
  quantity INTEGER NOT NULL CHECK (quantity > 0 AND quantity = CAST(quantity AS INTEGER)),
  price NUMERIC NOT NULL CHECK (price >= 0),
  UNIQUE (order_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_products_category ON Products(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON Orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON Order_Items(product_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_account_email ON Customers(email) WHERE password <> '';
