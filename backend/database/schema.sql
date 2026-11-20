-- Smart Expense Splitter schema
-- All money is stored as INTEGER PAISE (₹1 = 100 paise) to avoid floating-point errors.

CREATE DATABASE IF NOT EXISTS expense_splitter CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE expense_splitter;

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  profile_image VARCHAR(255) NULL,
  reset_token_hash VARCHAR(255) NULL,
  reset_token_expires DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

-- `groups` is a reserved word in MySQL 8, so it is always written with backticks.
CREATE TABLE IF NOT EXISTS `groups` (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(500) NULL,
  created_by INT UNSIGNED NOT NULL,
  is_archived TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_groups_creator FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_groups_created_by (created_by)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS group_members (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  group_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  role ENUM('admin','member') NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_group_user (group_id, user_id),
  CONSTRAINT fk_gm_group FOREIGN KEY (group_id) REFERENCES `groups`(id) ON DELETE CASCADE,
  CONSTRAINT fk_gm_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_gm_user (user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS expenses (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  group_id INT UNSIGNED NOT NULL,
  paid_by INT UNSIGNED NOT NULL,
  title VARCHAR(150) NOT NULL,
  description VARCHAR(500) NULL,
  amount BIGINT UNSIGNED NOT NULL,            -- paise
  category ENUM('Food','Rent','Groceries','Transportation','Electricity',
                'Entertainment','Shopping','Travel','Utilities','Others') NOT NULL DEFAULT 'Others',
  split_type ENUM('equal','exact','percentage','shares') NOT NULL,
  expense_date DATE NOT NULL,
  created_by INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_exp_group FOREIGN KEY (group_id) REFERENCES `groups`(id) ON DELETE CASCADE,
  CONSTRAINT fk_exp_payer FOREIGN KEY (paid_by) REFERENCES users(id),
  CONSTRAINT fk_exp_creator FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_exp_group_date (group_id, expense_date),
  INDEX idx_exp_category (category),
  INDEX idx_exp_paid_by (paid_by)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS expense_splits (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  expense_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  share_amount BIGINT UNSIGNED NOT NULL,      -- paise
  UNIQUE KEY uq_split (expense_id, user_id),
  CONSTRAINT fk_split_exp FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
  CONSTRAINT fk_split_user FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_split_user (user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS settlements (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  group_id INT UNSIGNED NOT NULL,
  paid_by INT UNSIGNED NOT NULL,              -- the debtor who pays
  paid_to INT UNSIGNED NOT NULL,              -- the creditor who receives
  amount BIGINT UNSIGNED NOT NULL,            -- paise
  status ENUM('pending','completed','rejected') NOT NULL DEFAULT 'pending',
  payment_date DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_set_group FOREIGN KEY (group_id) REFERENCES `groups`(id) ON DELETE CASCADE,
  CONSTRAINT fk_set_payer FOREIGN KEY (paid_by) REFERENCES users(id),
  CONSTRAINT fk_set_payee FOREIGN KEY (paid_to) REFERENCES users(id),
  CONSTRAINT chk_set_diff CHECK (paid_by <> paid_to),
  INDEX idx_set_group_status (group_id, status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS invitations (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  group_id INT UNSIGNED NOT NULL,
  invited_by INT UNSIGNED NOT NULL,
  invitation_code VARCHAR(32) NOT NULL,
  expires_at DATETIME NOT NULL,
  status ENUM('active','revoked','expired') NOT NULL DEFAULT 'active',
  UNIQUE KEY uq_invite_code (invitation_code),
  CONSTRAINT fk_inv_group FOREIGN KEY (group_id) REFERENCES `groups`(id) ON DELETE CASCADE,
  CONSTRAINT fk_inv_user FOREIGN KEY (invited_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS budgets (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  group_id INT UNSIGNED NULL,
  category VARCHAR(30) NOT NULL DEFAULT 'ALL',  -- 'ALL' = overall monthly budget
  amount BIGINT UNSIGNED NOT NULL,              -- paise
  month TINYINT UNSIGNED NOT NULL,
  year SMALLINT UNSIGNED NOT NULL,
  last_alert_level TINYINT UNSIGNED NOT NULL DEFAULT 0,  -- 0 none, 1 warning (>=80%), 2 exceeded (>=100%); stops duplicate alerts
  -- group_id_key avoids the MySQL quirk where NULLs are never "equal" in UNIQUE keys.
  group_id_key INT UNSIGNED GENERATED ALWAYS AS (IFNULL(group_id, 0)) VIRTUAL,
  UNIQUE KEY uq_budget (user_id, group_id_key, category, month, year),
  CONSTRAINT fk_bud_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_bud_group FOREIGN KEY (group_id) REFERENCES `groups`(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS notifications (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  title VARCHAR(150) NOT NULL,
  message VARCHAR(500) NOT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notif_user_read (user_id, is_read, created_at)
) ENGINE=InnoDB;
