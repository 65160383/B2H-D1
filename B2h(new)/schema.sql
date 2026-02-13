-- ===============================
-- DATABASE
-- ===============================
CREATE DATABASE IF NOT EXISTS b2h
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE b2h;

-- ===============================
-- USERS (เฉพาะ user / admin)
-- ===============================
CREATE TABLE users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  role ENUM('user','admin') NOT NULL DEFAULT 'user',
  status ENUM('active','banned') NOT NULL DEFAULT 'active',
  profile_image VARCHAR(255),
  contact_facebook VARCHAR(255),
  contact_line VARCHAR(255),
  contact_instagram VARCHAR(255),
  create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ===============================
-- PRODUCT
-- ===============================
CREATE TABLE product (
  product_id INT AUTO_INCREMENT PRIMARY KEY,
  seller_id INT NOT NULL,
  title VARCHAR(100) NOT NULL,
  description LONGTEXT,
  price DECIMAL(10,2) NOT NULL,
  contact VARCHAR(255),
  category VARCHAR(100),
  status ENUM('available','sold','hidden') DEFAULT 'available',
  create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_product_seller
    FOREIGN KEY (seller_id)
    REFERENCES users(user_id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- ===============================
-- PRODUCT IMAGES
-- ===============================
CREATE TABLE product_images (
  image_id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  img_url VARCHAR(255) NOT NULL,

  CONSTRAINT fk_product_images_product
    FOREIGN KEY (product_id)
    REFERENCES product(product_id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- ===============================
-- REVIEWS
-- ===============================
CREATE TABLE reviews (
  review_id INT AUTO_INCREMENT PRIMARY KEY,
  reviewer_id INT NOT NULL,
  seller_id INT NOT NULL,
  product_id INT NOT NULL,
  rating INT NOT NULL,
  comment LONGTEXT,
  create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_reviews_reviewer
    FOREIGN KEY (reviewer_id)
    REFERENCES users(user_id)
    ON DELETE CASCADE,

  CONSTRAINT fk_reviews_seller
    FOREIGN KEY (seller_id)
    REFERENCES users(user_id)
    ON DELETE CASCADE,

  CONSTRAINT fk_reviews_product
    FOREIGN KEY (product_id)
    REFERENCES product(product_id)
    ON DELETE CASCADE,

  CONSTRAINT chk_rating
    CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB;

-- ===============================
-- FAVORITES
-- ===============================
CREATE TABLE favorites (
  favorite_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  product_id INT NOT NULL,

  CONSTRAINT fk_favorites_user
    FOREIGN KEY (user_id)
    REFERENCES users(user_id)
    ON DELETE CASCADE,

  CONSTRAINT fk_favorites_product
    FOREIGN KEY (product_id)
    REFERENCES product(product_id)
    ON DELETE CASCADE,

  UNIQUE KEY uk_user_product (user_id, product_id)
) ENGINE=InnoDB;

-- ===============================
-- REPORT
-- ===============================
CREATE TABLE report (
  report_id INT AUTO_INCREMENT PRIMARY KEY,
  reporter_id INT NOT NULL,
  target_type ENUM('user','product','review') NOT NULL,
  target_id INT NOT NULL,
  reason LONGTEXT NOT NULL,
  status ENUM('pending','reviewed','rejected') DEFAULT 'pending',
  create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_report_reporter
    FOREIGN KEY (reporter_id)
    REFERENCES users(user_id)
    ON DELETE CASCADE
) ENGINE=InnoDB;
