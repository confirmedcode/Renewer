const should = require("chai").should();
const Client = require("../client.js");
const Constants = require('../constants.js');
const { reset, resetWithFailedSubscription, changeDate, resetDate} = require("../utilities.js");

const { User } = require("shared/models");
const { Subscription } = require("shared/models");

describe("Renewer Controller", () => {
  
  beforeEach(reset);
  
  describe("GET /renew", () => {
    
    describe("renew 1 iOS Subscription", () => {
      after(resetDate);
      it("should succeed", (done) => {
        changeDate("February 1, 2018 11:00:00");
        Client.getUrl("/renew")
          .then(response => {
            response.status.should.equal(200);
            response.body.message.should.equal("OK")
            return delay(3000);
          })
          .then(response => {
            return Subscription.getWithReceiptId(Constants.IOS_RECEIPT_VALID_ID);
          })
          .then(subscription => {
            // Should renew expiration 02/02/18 to 04/02/18
            subscription.receiptId.should.equal(Constants.IOS_RECEIPT_VALID_ID);
            subscription.userId.should.equal(Constants.NEW_USER_ID);
            subscription.expirationDateMs.should.equal(Constants.IOS_RECEIPT_EXPIRATION_MILLIS);
            done();
          })
          .catch(error => {
            done(error);
          });
      });
    });
    
    describe("renew 1 Stripe subscription", () => {
      after(resetDate);
      it("should succeed", (done) => {
        changeDate("October 5, 2040 11:00:00");
        Client.getUrl("/renew")
          .then(response => {
            response.status.should.equal(200);
            response.body.message.should.equal("OK")
            return delay(3000);
          })
          .then(response => {
            return Subscription.getWithReceiptId(Constants.EXISTING_USER_STRIPE_RECEIPT_ID);
          })
          .then(subscription => {
            // Should renew expiration 10/05/40 to 10/05/19
            subscription.receiptId.should.equal(Constants.EXISTING_USER_STRIPE_RECEIPT_ID);
            subscription.userId.should.equal(Constants.EXISTING_USER_ID);
            subscription.expirationDateMs.should.equal(Constants.EXISTING_USER_SUBSCRIPTION_EXPIRE_MILLIS);
            done();
          })
          .catch(error => {
            done(error);
          });
      });
    });
    
    // should not renew subs BEFORE or AFTER the date range
    describe("renew 0 subscriptions", () => {
      it("should succeed", (done) => {
        Client.getUrl("/renew")
          .then(response => {
            response.status.should.equal(200);
            response.body.message.should.equal("OK")
            return delay(3000);
          })
          .then(response => {
            return Subscription.getWithReceiptId(Constants.EXISTING_USER_STRIPE_RECEIPT_ID);
          })
          .then(subscription => {
            subscription.receiptId.should.equal(Constants.EXISTING_USER_STRIPE_RECEIPT_ID);
            subscription.userId.should.equal(Constants.EXISTING_USER_ID);
            subscription.expirationDateMs.should.equal(Constants.EXISTING_USER_SUBSCRIPTION_OLD_EXPIRE_MILLIS);
            return Subscription.getWithReceiptId(Constants.IOS_RECEIPT_VALID_ID);
          })
          .then(subscription => {
            subscription.receiptId.should.equal(Constants.IOS_RECEIPT_VALID_ID);
            subscription.userId.should.equal(Constants.NEW_USER_ID);
            subscription.expirationDateMs.should.equal(Constants.IOS_RECEIPT_OLD_EXPIRATION_MILLIS);
            done();
          })
          .catch(error => {
            done(error);
          });
      });
    });
    
    describe("renew 1 previously failed Stripe subscription", () => {
      it("should succeed", (done) => {
        resetWithFailedSubscription()
          .then( result => {
            return Client.getUrl("/renew")
          })
          .then(response => {
            response.status.should.equal(200);
            response.body.message.should.equal("OK")
            return delay(3000);
          })
          .then(response => {
            return Subscription.getWithReceiptId(Constants.EXISTING_USER_STRIPE_RECEIPT_ID);
          })
          .then(subscription => {
            // Should renew expiration 10/05/40 to 10/05/19
            subscription.receiptId.should.equal(Constants.EXISTING_USER_STRIPE_RECEIPT_ID);
            subscription.userId.should.equal(Constants.EXISTING_USER_ID);
            subscription.expirationDateMs.should.equal(Constants.EXISTING_USER_SUBSCRIPTION_EXPIRE_MILLIS);
            done();
          })
          .catch(error => {
            done(error);
          });
      });
    });
    
  });
  
  describe("GET /renew-all", () => {
    
    describe("renew both even though they're out of range", () => {
      it("should succeed", (done) => {
        Client.getUrl("/renew-all")
          .then(response => {
            response.status.should.equal(200);
            response.body.message.should.equal("OK")
            return delay(3000);
          })
          .then(response => {
            return Subscription.getWithReceiptId(Constants.IOS_RECEIPT_VALID_ID);
          })
          .then(subscription => {
            // Should renew expiration 02/02/18 to 04/02/18
            subscription.receiptId.should.equal(Constants.IOS_RECEIPT_VALID_ID);
            subscription.userId.should.equal(Constants.NEW_USER_ID);
            subscription.expirationDateMs.should.equal(Constants.IOS_RECEIPT_EXPIRATION_MILLIS);
            return Subscription.getWithReceiptId(Constants.EXISTING_USER_STRIPE_RECEIPT_ID);
          })
          .then(subscription => {
            // Should renew expiration 10/05/40 to 10/05/19
            subscription.receiptId.should.equal(Constants.EXISTING_USER_STRIPE_RECEIPT_ID);
            subscription.userId.should.equal(Constants.EXISTING_USER_ID);
            subscription.expirationDateMs.should.equal(Constants.EXISTING_USER_SUBSCRIPTION_EXPIRE_MILLIS);
            done();
          })
          .catch(error => {
            done(error);
          });
      });
    });
    
  });
  
  describe("GET /renew-user", () => {
    
    describe("renew 1 iOS user", () => {
      it("should succeed", (done) => {
        Client.getUrl("/renew-user", {
          id: Constants.NEW_USER_ID
          })
          .then(response => {
            response.status.should.equal(200);
            response.body.message.should.contain(Constants.NEW_USER_ID);
            return delay(3000);
          })
          .then(response => {
            return Subscription.getWithReceiptId(Constants.IOS_RECEIPT_VALID_ID);
          })
          .then(subscription => {
            // iOS should renew
            subscription.receiptId.should.equal(Constants.IOS_RECEIPT_VALID_ID);
            subscription.userId.should.equal(Constants.NEW_USER_ID);
            subscription.expirationDateMs.should.equal(Constants.IOS_RECEIPT_EXPIRATION_MILLIS);
            return Subscription.getWithReceiptId(Constants.EXISTING_USER_STRIPE_RECEIPT_ID);
          })
          .then(subscription => {
            // stripe should not renew
            subscription.receiptId.should.equal(Constants.EXISTING_USER_STRIPE_RECEIPT_ID);
            subscription.userId.should.equal(Constants.EXISTING_USER_ID);
            subscription.expirationDateMs.should.equal(Constants.EXISTING_USER_SUBSCRIPTION_OLD_EXPIRE_MILLIS);
            done();
          })
          .catch(error => {
            done(error);
          });
      });
    });
    
  });
  
  describe("GET /failed", () => {
    
    it("should succeed", (done) => {
      resetWithFailedSubscription()
        .then( result => {
          return Client.getUrl("/failed")
        })
        .then(response => {
          response.status.should.equal(200);
          response.body.message.should.equal("Failed check started.")
          return delay(3000);
        })
        .then(response => {
          return Subscription.getWithReceiptId(Constants.EXISTING_USER_STRIPE_RECEIPT_ID);
        })
        .then(subscription => {
          // Should renew expiration 10/05/40 to 10/05/19
          subscription.receiptId.should.equal(Constants.EXISTING_USER_STRIPE_RECEIPT_ID);
          subscription.userId.should.equal(Constants.EXISTING_USER_ID);
          subscription.expirationDateMs.should.equal(Constants.EXISTING_USER_SUBSCRIPTION_EXPIRE_MILLIS);
          done();
        })
        .catch(error => {
          done(error);
        });
    });
    
  });
  
});

function delay(t, v) {
   return new Promise(function(resolve) { 
       setTimeout(resolve.bind(null, v), t)
   });
}