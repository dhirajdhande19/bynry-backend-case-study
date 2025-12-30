# Part 1: Code Review & Debugging

## Overview
This section reviews an existing API endpoint responsible for creating a product and initializing its inventory.
The goal is to identify technical and business-logic issues, explain their potential impact in production, and
propose corrections based on backend engineering best practices.

---

## Original Code Context
- **Endpoint purpose:** Create a new product and initialize its inventory for a specific warehouse.
- **Expected behavior:** The API should create a product record, initialize inventory for the given warehouse, and return a success response.
- **Assumptions based on available requirements:**  
  - The request payload contains valid product and inventory data.  
  - The database schema supports products and inventory records.  
  - The operation is expected to be atomic from a business perspective.


---

## Issues Identified

### Issue 1 (technical):
- **Description:** The incoming data read from `request.json` is not validated.

### Issue 2 (technical):
- **Description:** While creating a product or updating inventory, database-level errors may occur even when valid
  data is provided (for example, due to database constraints, connectivity issues, or schema mismatches).
  Since these errors are not handled explicitly, the product creation and inventory update may fail, causing the API
  to crash due to a lack of proper error handling.

### Issue 3 (business logic):
- **Description:** Currently, routing logic, controller logic, and business logic are tightly coupled within a single
  controller. As the application grows, this controller will become cluttered and difficult to maintain. To improve
  scalability and readability, responsibilities should be separated into different layers: routes, controllers, and services.
  This separation of concerns makes the codebase easier to extend, test, and maintain over time.

---

## Production Impact

### Issue 1 Impact:
- **What could go wrong:** Since the incoming data is not validated, the API may receive empty or invalid values.
  In such cases, accessing properties like `data.name`, `data.sku`, `data.price`, or `data.warehouse_id` can
  cause runtime errors. This would result in the request failing at the controller level itself.
- **Who would be affected:** Backend services (the API may crash or return unhandled errors).
- **Severity:** High to critical.

### Issue 2 Impact:
- **What could go wrong:** If the database throws an error, the API has no mechanism to catch and handle
   it gracefully. This can result in unhandled runtime exceptions and incomplete operations.
- **Who would be affected:** Backend services and end users, as the API may return generic errors or fail unexpectedly.
- **Severity:** High to critical.

### Issue 3 Impact:
- **What could go wrong:** As the application grows, maintaining and extending features becomes increasingly difficult
  due to tightly coupled logic.
- **Who would be affected:** The development team, especially new developers onboarding to the project, as understanding
  and modifying the codebase would take more time and effort.
- **Severity:** Moderate to high.


---

## Proposed Fixes

### Fix for Issue 1:
- **What needs to change:** The request payload should be validated before it is used in the controller logic.

#### Fix (option) 1:
- **How to Fix:** Validate the incoming data directly inside the controller before proceeding further.
  ```js
  // example:
  const data = req.body; // request.json;
  // validate presence of request body
  if(!data) {
    return res.json({
      message: "Please provide data to continue."
    })
  }

  // Validate required fields such as (name, sku, price, warehouse_id)
  if(!data.name || !data.sku || !data.price || !data.warehouse_id) {
    return res.json({
      message: "Please ensure all the required fields are provided (name, sku, price, warehouse_id)."
    })
  }

  // further operations (creating product, updating inventory)
  ```
- **Why this resolves the issue:** This ensures that all required fields are present before the data is used,
preventing runtime errors caused by undefined or invalid values.
- **Cons:** Manually validating each field using conditional checks does not scale well. As the number of fields
increases, the controller can become cluttered with repetitive validation logic.
- **Solution:** Use a schema-based validation library such as Joi or Zod (see Option 2 below).

#### Fix (option) 2:
- **How to Fix:** Validate the request payload using a schema validation library before it reaches the controller.
- **Steps:**
-   1. We create a `product.schema.js` file that defines the expected structure of the request body:
  ```js
  import Joi from 'joi';

  export const productSchema = Joi.object({
    name: Joi.string().required().min(3),
    sku: Joi.string().required(),
    price: Joi.number().required().min(1),
    warehouse_id: Joi.string().required()
  })
  ```
  - 2. Validate the request body in the controller (or preferably via a reusable middleware):
  ```js
  // import productSchema
  app.post("/api/products", async (req, res) => {
    const { error, value } = productSchema.validate(req.body, { abortEarly: false });

    if (error) {
      return res.status(400).json({
        message: "Validation failed",
        details: error.details.map(d => d.message),
      });
    }

    // creating product & updating inventory
  });
  ```

- **Why this resolves the issue:** The request payload is consistently validated before business logic executes,
reducing the chances of runtime errors and invalid data entering the system.
- **Pros:** This approach is more scalable and maintainable than manual validation. The validation logic can be
reused across multiple endpoints by extracting it into middleware.
  
### Fix for Issue 2:
- **What needs to change:** Database and runtime errors should be handled gracefully to prevent the API from
 crashing and to return meaningful error responses.

#### Fix (option) 1:
- **How to Fix:**  Use a `try-catch` block to handle errors during asynchronous database operations. Wrapping  
  the logic in a `try-catch` ensures that any error thrown during product creation or inventory updates is
  caught and handled properly.
```js
// POST /api/products
app.post("/api/products", async (req, res) => {
  const data = req.body;
  try {
      // Create new product
      const product = await Product.create({
        name: data.name,
        sku: data.sku,
        price: data.price,
        warehouse_id: data.warehouse_id,
      });
    
      // Update inventory count
      const inventory = await Inventory.create({
        product_id: product.id,
        warehouse_id: data.warehouse_id,
        quantity: data.initial_quantity,
      });
    
      return res.json({
        message: "Product created",
        product_id: product.id,
      });
  } catch(error) {
      return res.status(500).json({
        message: "Error occured in the server",
        details: error.message
      })
  }

});
```
 
- **Why this resolves the issue:** This ensures that database errors do not crash the server and allows the API to return a controlled and meaningful error response.
- **Cons:** While effective, using try-catch blocks in every controller leads to code repetition. As the application grows, this pattern can clutter controllers and reduce readability.
- **Solution:** Abstract error handling using a reusable async wrapper (see Option 2)

#### Fix (option) 2:
- **How to Fix:**  Create a reusable wrapAsync middleware to handle errors for asynchronous route handlers, eliminating the need to write try-catch blocks in every controller.
**Steps:**
1. Create a `utils` folder and add a `wrapAsync.js` file
```js
export const wrapAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};
```
2. import and use `wrapAsync` in controllers:
```js
app.post(
  "/api/products",
  wrapAsync(
    async (req, res) => {
      // creating and updating inventory
  })
);
```

- **Why this resolves the issue:** Errors are still handled centrally, but without repetitive try-catch blocks in each controller.
- **Benefits of Using a Wrapper:**  
    **1.Cleaner Code:** Reduces boilerplate and improves readability.   
    **2.Separation of Concerns:** Business logic remains focused, while error handling is centralized.  
    **3.Reusability:** The same wrapper can be reused across multiple routes and controllers.  


### Fix for Issue 3:

- **What needs to change:** The codebase should be refactored to separate routing, controller logic, and business logic into dedicated components.
- This improves scalability, readability, and long-term maintainability.
- **How to Fix:**
  **Steps:**
  1. We create a folder called `src/` which holds all the source code
  2. Inside this `src/modules/` folder we create differnt folder as per features such as `auth/` for authentication (register, login) & `product/` (for product related work) and so on...
  3. `src/modules/product/` we create `product.routes.js` which will look like:
  ```js
  import { Router } from "express";
  import * as productController from "./product.controller.js";
  import { createProduct } from "./product.schema.js";
  
  const router = Router();
  
  router.post("/", validate(productSchema), productController.createProduct);
  
  export default router;
  // Validation errors are assumed to be handled by Joi
  ```
  4. we create a `middleware` folder  outside `modules` like `src/middleware/` inside this we write joi validation handler inside `validate.js`:
  ```js
  export const validate = (schema) => {
    return (req, res, next) => {
      const { error } = schema.validate(req.body, { abortEarly: false });
  
      if (error) {
        return res.status(400).json({
          message: "Validation failed",
          details: error.details.map(d => d.message),
        });
      }
  
      next();
    };
  };
  ```
  4. now inside `src/modules/product/` we create `product.schema.js` (joi validation logic here)
  ```js
    import Joi from 'joi';

    export const productSchema = Joi.object({
      name: Joi.string().required().min(3),
      sku: Joi.string().required(),
      price: Joi.number().required().min(1),
      warehouse_id: Joi.string().required()
    })
  ```
  5. inside `src/modules/product/` create `product.controller.js`
  ```js
  import * as productService from "./product.service";
  export const createProduct = wrapAsync(async(req, res) => {
      const data = req.body;
  
      // create product
      const product = await productService.createProduct(data);
  
      // update inventory
      await productService.updateInventory(data, product);

      return res.json({
          message: "Product created",
          product_id: product.id,
      })
  })
  ```
  6. now create `product.service.js` inside `src/modules/product/` 
  ```js
  export const createProduct = async (data) => {
    const product = await Product.create({
      name: data.name,
      sku: data.sku,
      price: data.price,
      warehouse_id: data.warehouse_id,
    });
  
    return product; 
  };
  
  export const updateInventory = async (data, product) => {
    const inventory = await Inventory.create({
      product_id: product.id,
      warehouse_id: data.warehouse_id,
      quantity: data.initial_quantity,
    });
  
    return inventory; // optional 
  };
  ```
- **Why this resolves the issue:** This structure allows the application to scale more easily as new features are added.
  Controllers remain small and focused, business logic is centralized in services, and new developers can understand the
  codebase faster with clearly defined responsibilities.

---

## Edge Cases Considered
- Duplicate SKU values being submitted for different products.
- Inventory initialization with zero quantity.
- Partial failures where product creation succeeds but inventory creation fails.

---

## Assumptions Made
- SKU values are expected to be unique across the platform.
- A product must have at least one associated inventory record at creation time.
- Validation errors should return a `400 Bad Request` response.

---

## Notes for Live Discussion
- Topics I would like to clarify with the product/engineering team:
  - Should a product always be created with inventory, or can inventory be added later?
  - What should happen if inventory creation fails after the product is created?
  - Are SKU values expected to be unique across the entire platform or per company?

- Alternative approaches considered:
  - Keeping all logic inside the controller for simplicity, but choosing separation of
    concerns for better maintainability.

