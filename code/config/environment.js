const Logger = require("shared/logger");

// Load environment variables
require("shared/environment")([
  "COMMON",
  "RENEWER"
]);

// Load database login
process.env.PG_USER = "renewer";
process.env.PG_PASSWORD = process.env.PG_RENEWER_PASSWORD;