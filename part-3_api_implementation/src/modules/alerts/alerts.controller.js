import * as alertService from "./alerts.service.js";

export const getLowStockAlerts = async (req, res) => {
  const { companyId } = req.params;

  const alerts = await alertService.fetchLowStockAlerts(companyId);

  return res.json({
    alerts,
    total_alerts: alerts.length,
  });
};
