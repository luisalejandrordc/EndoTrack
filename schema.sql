CREATE TABLE IF NOT EXISTS employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  doc_type ENUM ('DNI', 'CE', 'PAS') NOT NULL,
  doc_number VARCHAR(20) NOT NULL,
  first_name VARCHAR(80) NOT NULL,
  last_name VARCHAR(80) NOT NULL,
  role ENUM ('System Admin', 'Sales Manager', 'Sales Advisor') NOT NULL,
  email VARCHAR(120) NOT NULL,
  phone VARCHAR(30) NULL,
  password_hash VARCHAR(255) NOT NULL,
  active TINYINT (1) NOT NULL DEFAULT 1,
  UNIQUE KEY uq_emp_doc (doc_type, doc_number)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type ENUM (
    'Diplomático',
    'Embajada',
    'Entidad religiosa católica',
    'Entidad religiosa no católica',
    'Organismo internacional'
  ) NOT NULL,
  doc_type ENUM ('DNI', 'CE', 'PAS', 'CDI', 'RUC') NOT NULL,
  doc_number VARCHAR(20) NOT NULL,
  name VARCHAR(200) NOT NULL,
  nationality VARCHAR(80) NULL,
  contact_person VARCHAR(120) NULL,
  email VARCHAR(120) NOT NULL,
  phone VARCHAR(30) NULL,
  password_hash VARCHAR(255) NOT NULL,
  must_change_password TINYINT (1) NOT NULL DEFAULT 1,
  created_by INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cust_doc (doc_type, doc_number)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS vehicle_models (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  category VARCHAR(40) NOT NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS vehicle_versions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  model_id INT NOT NULL,
  name VARCHAR(80) NOT NULL,
  reference_price DECIMAL(12, 2) NOT NULL,
  active TINYINT (1) NOT NULL DEFAULT 1,
  FOREIGN KEY (model_id) REFERENCES vehicle_models (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS vehicle_colors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  model_id INT NOT NULL,
  name VARCHAR(60) NOT NULL,
  FOREIGN KEY (model_id) REFERENCES vehicle_models (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS sales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  advisor_id INT NOT NULL,
  version_id INT NOT NULL,
  color_id INT NOT NULL,
  customer_name_snapshot VARCHAR(200) NOT NULL,
  customer_doc_type_snapshot VARCHAR(10) NOT NULL,
  customer_doc_number_snapshot VARCHAR(20) NOT NULL,
  price_snapshot DECIMAL(12, 2) NOT NULL,
  temperature ENUM ('Hot', 'Warm', 'Cold') NOT NULL DEFAULT 'Warm',
  status ENUM ('active', 'completed', 'cancelled') NOT NULL DEFAULT 'active',
  cancel_reason VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers (id),
  FOREIGN KEY (advisor_id) REFERENCES employees (id),
  FOREIGN KEY (version_id) REFERENCES vehicle_versions (id),
  FOREIGN KEY (color_id) REFERENCES vehicle_colors (id),
  KEY idx_sales_status (status),
  KEY idx_sales_advisor (advisor_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS sale_tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sale_id INT NOT NULL,
  task_no TINYINT NOT NULL,
  status ENUM ('pending', 'in_progress', 'completed') NOT NULL DEFAULT 'pending',
  started_at DATETIME NULL,
  due_at DATETIME NULL,
  completed_at DATETIME NULL,
  notes TEXT NULL,
  UNIQUE KEY uq_sale_task (sale_id, task_no),
  FOREIGN KEY (sale_id) REFERENCES sales (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS audit_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sale_id INT NOT NULL,
  user_id INT NOT NULL,
  action VARCHAR(40) NOT NULL,
  detail VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_audit_sale (sale_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS access_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_type ENUM ('Employee', 'Customer') NOT NULL,
  document_type VARCHAR(10) NOT NULL,
  document_number VARCHAR(20) NOT NULL,
  user_id INT NULL,
  action_type ENUM ('LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT') NOT NULL,
  ip_address VARCHAR(45) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_access_lookup (
    user_type,
    document_type,
    document_number,
    created_at
  )
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4
