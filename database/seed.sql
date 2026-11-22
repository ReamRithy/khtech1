INSERT OR IGNORE INTO Categories (category_id,category_name,description) VALUES
  (1,'Computers','Reliable computers for work and study.'),
  (2,'Accessories','Everyday essentials for your desk.'),
  (3,'Displays','More space for your next big idea.');
INSERT OR IGNORE INTO Products (product_id,category_id,product_name,price,stock_quantity) VALUES
  (1,1,'Laptop',650,15),(2,2,'Mouse',15,50),(3,2,'Keyboard',25,30),(4,3,'Monitor',120,20);
