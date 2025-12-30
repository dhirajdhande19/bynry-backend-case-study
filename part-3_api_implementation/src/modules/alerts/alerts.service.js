export const fetchLowStockAlerts = async (companyId) => {
  // 1. Fetch warehouses for the company
  const warehouses = await Warehouse.findAll({
    where: { company_id: companyId },
  });

  const alerts = [];

  for (const warehouse of warehouses) {
    // 2. Fetch inventory for this warehouse
    const inventories = await Inventory.findAll({
      where: { warehouse_id: warehouse.id },
      include: [Product],
    });

    for (const item of inventories) {
      const product = item.Product;

      // 3. Determine low-stock threshold
      const threshold = getThresholdByProductType(product.product_type);

      if (item.quantity >= threshold) continue;

      // 4. Check recent sales activity
      const hasRecentSales = await hasRecentSalesActivity(
        product.id,
        warehouse.id
      );

      if (!hasRecentSales) continue;

      // 5. Calculate days until stockout
      const avgDailySales = await getAverageDailySales(
        product.id,
        warehouse.id
      );

      const daysUntilStockout =
        avgDailySales > 0 ? Math.floor(item.quantity / avgDailySales) : null;

      // 6. Fetch supplier info
      const supplier = await getSupplierForProduct(product.id);

      alerts.push({
        product_id: product.id,
        product_name: product.name,
        sku: product.sku,
        warehouse_id: warehouse.id,
        warehouse_name: warehouse.name,
        current_stock: item.quantity,
        threshold,
        days_until_stockout: daysUntilStockout,
        supplier,
      });
    }
  }

  return alerts;
};
