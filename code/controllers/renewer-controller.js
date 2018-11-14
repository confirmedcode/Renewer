const ConfirmedError = require("shared/error");
const Logger = require("shared/logger");

// Models
const { Subscription } = require("shared/models");

const ENVIRONMENT = process.env.ENVIRONMENT;
const NODE_ENV = process.env.NODE_ENV;
const START_DAYS_AGO = process.env.START_DAYS_AGO;
const END_DAYS_LATER = process.env.END_DAYS_LATER;

const AWS = require("aws-sdk")
const CloudWatch = new AWS.CloudWatch( { apiVersion: "2010-08-01" } );
const schedule = require("node-schedule");

const router = require("express").Router();

if (NODE_ENV === "production") {
  var scheduledCheck = schedule.scheduleJob('50 12 * * *', renewRange); // check every day at 12:50AM
}

router.get("/renew",
(request, response, next) => {
  renewRange();
	return response.status(200).json({
		message: "OK"
	});
});

router.get("/renew-all",
(request, response, next) => {
  Subscription.renewAll();
	return response.status(200).json({
		message: "OK"
	});
});

router.get("/renew-user",
(request, response, next) => {
  var id = request.query.id;
  Subscription.renewUser(id);
  response.status(200).json({
    message: id + " check started."
  });
});

router.get("/failed",
(request, response, next) => {	
  Subscription.renewFailed();
  response.status(200).json({
    message: "Failed check started."
  });
});

function renewRange() {
  Subscription.renewRange(START_DAYS_AGO, END_DAYS_LATER)
  .then((result) => {
    Logger.info("Finshed renewing subscriptions in days range.");
    Logger.info(`Success: ${result.success}, Fail: ${result.fail}`);
    publishToCloudWatch(result.success, result.fail);
  })
  .catch(error => {
    Logger.error(error);
  });
}

function publishToCloudWatch(successChecked, failedChecked) {
  if (ENVIRONMENT === "LOCAL") {
    Logger.info("Local environment, not publishing to cloudwatch");
    return;
  }
  var successParams = {
    MetricData: [
      {
        MetricName: "Successful Subscription Updates", /* required */
        Dimensions: [
          {
            Name: "Environment",
            Value: ENVIRONMENT
          }
        ],
        Timestamp: new Date(),
        Unit: "Count",
        Value: successChecked
      },
    ],
    Namespace: "CVPN/Renewer"
  };
  var failedParams = {
    MetricData: [
      {
        MetricName: "Failed Subscription Updates", /* required */
        Dimensions: [
          {
            Name: "Environment",
            Value: ENVIRONMENT
          }
        ],
        Timestamp: new Date(),
        Unit: "Count",
        Value: failedChecked
      },
    ],
    Namespace: "CVPN/Renewer"
  };
  CloudWatch.putMetricData(successParams, function(err, data) {
    if (err) {
      Logger.error("ERROR: Couldn't publish success metric: ", err, err.stack)
    }
    else {
      Logger.info(data);
    }
  });
  CloudWatch.putMetricData(failedParams, function(err, data) {
    if (err) {
      Logger.error("ERROR: Couldn't publish failed metric: ", err, err.stack)
    }
    else {
      Logger.info(data);
    }
  });
}

module.exports = router;