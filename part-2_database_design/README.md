# Part 2: Database Design

## Overview
This section proposes a database schema for a B2B inventory management platform that supports multiple companies,
warehouses, suppliers, and inventory tracking. The design focuses on scalability, data integrity, and clear
relationships while accounting for incomplete requirements.

---

## Core Requirements Addressed
- Companies can have multiple warehouses
- Products can be stored in multiple warehouses with different quantities
- Inventory level changes must be tracked
- Suppliers provide products to companies
- Some products can be bundles composed of other products

---

## Proposed Database Schema

### 1. companies
Stores company-level information.

| Column        | Type        | Notes |
|--------------|------------|-------|
| id           | UUID / INT | Primary Key |
| name         | VARCHAR    | Company name |
| created_at  | TIMESTAMP  | Audit field |

---

### 2. warehouses
Each company can have multiple warehouses.

| Column        | Type        | Notes |
|--------------|------------|-------|
| id           | UUID / INT | Primary Key |
| company_id   | FK         | References `companies.id` |
| name         | VARCHAR    | Warehouse name |
| location     | VARCHAR    | Optional |
| created_at  | TIMESTAMP  | Audit field |

---

### 3. products
Represents individual products.

| Column        | Type        | Notes |
|--------------|------------|-------|
| id           | UUID / INT | Primary Key |
| company_id   | FK         | References `companies.id` |
| name         | VARCHAR    | Product name |
| sku          | VARCHAR    | Unique identifier |
| price        | DECIMAL    | Product price |
| product_type | ENUM       | simple / bundle |
| created_at  | TIMESTAMP  | Audit field |

**Constraints**
- `sku` should be unique (scope to be clarified: global vs company-level)

---

### 4. inventory
Tracks product quantities per warehouse.

| Column        | Type        | Notes |
|--------------|------------|-------|
| id           | UUID / INT | Primary Key |
| product_id   | FK         | References `products.id` |
| warehouse_id | FK         | References `warehouses.id` |
| quantity     | INT        | Current stock |
| updated_at   | TIMESTAMP  | Last updated time |

**Constraints**
- Unique `(product_id, warehouse_id)` pair

---

### 5. inventory_logs
Tracks historical inventory changes.

| Column        | Type        | Notes |
|--------------|------------|-------|
| id           | UUID / INT | Primary Key |
| inventory_id | FK         | References `inventory.id` |
| change_type  | ENUM       | increase / decrease |
| quantity     | INT        | Quantity changed |
| reason       | VARCHAR    | Sale, restock, adjustment |
| created_at  | TIMESTAMP  | Change timestamp |

---

### 6. suppliers
Stores supplier information.

| Column        | Type        | Notes |
|--------------|------------|-------|
| id           | UUID / INT | Primary Key |
| name         | VARCHAR    | Supplier name |
| contact_email| VARCHAR    | For reordering |
| created_at  | TIMESTAMP  | Audit field |

---

### 7. product_suppliers
Many-to-many relationship between products and suppliers.

| Column        | Type        | Notes |
|--------------|------------|-------|
| product_id   | FK         | References `products.id` |
| supplier_id  | FK         | References `suppliers.id` |

**Primary Key**
- `(product_id, supplier_id)`

---

### 8. product_bundles
Defines bundle relationships between products.

| Column          | Type        | Notes |
|----------------|------------|-------|
| bundle_id      | FK         | References `products.id` |
| child_product_id | FK       | References `products.id` |
| quantity       | INT        | Quantity of child product |

**Use Case**
- A bundle product composed of multiple other products

---

## Design Decisions & Justifications

- **Separation of inventory and products:** Allows the same product to exist in multiple warehouses with different quantities.
- **Inventory logs table:** Enables auditing, analytics, and debugging stock issues.
- **Many-to-many supplier mapping:** A product can have multiple suppliers and vice versa.
- **Bundle modeling via self-referencing table:** Keeps bundle logic flexible without complicating the main product table.
- **Indexes recommended on:**
  - `products.sku`
  - `inventory.product_id`
  - `inventory.warehouse_id`
  - `inventory_logs.inventory_id`

---

## Identified Gaps & Questions for Product Team

- Should SKU be unique globally or only within a company?
- Can a product exist without inventory in any warehouse?
- Are bundles allowed to contain other bundles (nested bundles)?
- How should inventory be handled for bundled products (derived vs stored)?
- Is supplier association company-specific or global?
- Do we need soft deletes for products or warehouses?

---

## Assumptions Made

- Inventory is tracked per warehouse, not aggregated at the company level.
- Products belong to a single company.
- Inventory changes are append-only in `inventory_logs`.
- Bundles are logical groupings, not physical inventory items.

---

## Notes for Live Discussion

- Trade-offs between normalization and query performance.
- Handling inventory consistency during concurrent updates.
- Possible use of database transactions for inventory updates.
- Alternative schema designs considered for bundle handling.
