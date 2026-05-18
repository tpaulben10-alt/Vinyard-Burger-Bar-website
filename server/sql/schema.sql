CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('customer', 'admin') DEFAULT 'customer',
  is_online BOOLEAN DEFAULT FALSE,
  last_seen TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS menu_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) UNIQUE NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  category VARCHAR(80) NOT NULL,
  image_url VARCHAR(2048),
  is_available BOOLEAN DEFAULT TRUE,
  stock INT NOT NULL DEFAULT 0,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_order_code VARCHAR(32) UNIQUE NOT NULL,
  customer_id BIGINT UNSIGNED,
  customer_name VARCHAR(120) NOT NULL,
  customer_phone VARCHAR(30) NOT NULL,
  customer_address VARCHAR(500) NOT NULL,
  customer_notes TEXT,
  service_type ENUM('delivery', 'pickup', 'pos') NOT NULL DEFAULT 'pickup',
  pickup_time DATETIME,
  payment_method ENUM('cash_on_delivery', 'cash_on_pickup', 'cash', 'gcash', 'card') NOT NULL DEFAULT 'cash_on_pickup',
  status ENUM('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
  total DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  menu_item_id BIGINT UNSIGNED,
  item_name VARCHAR(120) NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
