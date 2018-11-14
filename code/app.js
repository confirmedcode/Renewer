// Load environment
require("./config/environment.js");

// Shared
const ConfirmedError = require("shared/error");
const Logger = require("shared/logger");

// Express and body parsers
const express = require("express");
const app = express();
app.use(express.urlencoded({ extended: true }));

// Renewer logs everything including successful requests
const expressWinston = require('express-winston');
expressWinston.requestWhitelist = ['url', 'session', 'ip', 'method', 'httpVersion', 'originalUrl', 'query'];
app.use(expressWinston.logger({
  winstonInstance: Logger
}));

// Log unhandled rejections
process.on("unhandledRejection", error => {
  Logger.error(`unhandledRejection:
    ${error.stack}`);
});

// Basic Security
app.use(require("helmet")());

// Controllers
app.use("/", require("./controllers/renewer-controller.js"));

app.get("/error-test", (request, response, next) => {
  next(new ConfirmedError(500, 999, "Test alerts", "Details here"));
});

app.get("/health", function(request, response, next) {
	return response.status(200).json({
		message: "OK from Renewer"
	});
});

// Log Errors
app.use(expressWinston.errorLogger({
  winstonInstance: Logger
}));

// Handle Errors
app.use((error, request, response, next) => {  
  response.status(error.statusCode).json({
    code: error.confirmedCode,
    message: error.message
  });
})

// Handle 404 Not Found
app.use((request, response, next) => {
  Logger.error("404 NOT FOUND - " + request.originalUrl);
  response.status(404).json({
    code: 404,
    message: "Not Found"
  });
});

module.exports = app;