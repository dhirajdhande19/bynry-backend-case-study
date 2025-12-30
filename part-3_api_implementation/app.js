import express from "express";
import alertRoutes from "./src/modules/alerts/alerts.routes.js";

const app = express();

app.use("/api", alertRoutes);

app.listen(8000, () => {
  // connect database
  console.log("Connected to DB");
  console.log("Server running on 8000");
});
