# Part 3: API Implementation – Low Stock Alerts

## Overview
This section implements an API endpoint that returns low-stock alerts for a company across all its warehouses.
The goal is to identify products that are running low, have recent sales activity, and include supplier
information for reordering.

---

## Endpoint Specification

**GET** `/api/companies/{company_id}/alerts/low-stock`

### Expected Response Format
```json
{
  "alerts": [
    {
      "product_id": 123,
      "product_name": "Widget A",
      "sku": "WID-001",
      "warehouse_id": 456,
      "warehouse_name": "Main Warehouse",
      "current_stock": 5,
      "threshold": 20,
      "days_until_stockout": 12,
      "supplier": {
        "id": 789,
        "name": "Supplier Corp",
        "contact_email": "orders@supplier.com"
      }
    }
  ],
  "total_alerts": 1
}
````

---

## Business Rules

* Low stock threshold varies by product type
* Only products with recent sales activity are included
* Multiple warehouses per company are supported
* Supplier information is included for reordering

---

## Approach

1. Fetch all warehouses for the given company
2. Retrieve inventory data per warehouse
3. Apply low-stock threshold based on product type
4. Filter products without recent sales activity
5. Calculate estimated days until stockout
6. Attach supplier information
7. Return aggregated alerts

Most of the logic is handled in the service layer to keep the controller lightweight.

---

## Edge Cases Considered

* Products without recent sales activity are excluded
* Products with zero average daily sales return `null` for days until stockout
* Warehouses without inventory records are skipped
* Missing supplier information is handled gracefully

---

## Assumptions Made

* Recent sales activity means sales within the last 30 days
* Threshold values are derived from product type
* Average daily sales can be calculated from historical sales data
* Each product has at least one supplier

---

## Notes for Live Discussion

* Possible use of database transactions for consistency
* Performance optimization via query batching
* Alternative approaches for stockout prediction
