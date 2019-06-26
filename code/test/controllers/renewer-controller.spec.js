const should = require("chai").should();
const sinon = require("sinon");
const Client = require("../client.js");
const Constants = require('../constants.js');
const { reset, resetWithIosStripeUser, resetWithFailedSubscription, changeDate, resetDate} = require("../utilities.js");

const { User } = require("shared/models");
const { Subscription } = require("shared/models");
const { Email } = require("shared/utilities");

describe("Renewer Controller", () => {
  
  beforeEach(reset);
  
  describe("GET /renew", () => {
    
    describe("renew 1 iOS Subscription", () => {
      after(function() {
        Email.sendCancelSubscription.restore();
        resetDate();
      });
      it("should succeed and send no cancellation email because it's still 'active'", (done) => {
        const spyEmailSendCancelSubscription = sinon.spy(Email, 'sendCancelSubscription');
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
            // cancelled but still active on Feb 1st, so don't send cancellation email
            sinon.assert.notCalled(spyEmailSendCancelSubscription);
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
      after(function () {
        Email.sendCancelSubscription.restore();
      });
      it("should succeed and send two cancellation emails", (done) => {
        const spyEmailSendCancelSubscription = sinon.spy(Email, 'sendCancelSubscription');
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
            // both Stripe and iOS sub are cancelled, so this should be called twice
            sinon.assert.calledTwice(spyEmailSendCancelSubscription);
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
      after(function () {
        Email.sendCancelSubscription.restore();
      });
      it("should succeed and send cancellation email the first time, but not the second time", (done) => {
        const spyEmailSendCancelSubscription = sinon.spy(Email, 'sendCancelSubscription');
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
            sinon.assert.calledOnce(spyEmailSendCancelSubscription);
            Email.sendCancelSubscription.resetHistory();
            // stripe should not renew
            subscription.receiptId.should.equal(Constants.EXISTING_USER_STRIPE_RECEIPT_ID);
            subscription.userId.should.equal(Constants.EXISTING_USER_ID);
            subscription.expirationDateMs.should.equal(Constants.EXISTING_USER_SUBSCRIPTION_OLD_EXPIRE_MILLIS);
            return Client.getUrl("/renew-user", {
              id: Constants.NEW_USER_ID
            });
          })
          .then(subscription => {
            return delay(2000);
          })
          .then(subscription => {
            sinon.assert.notCalled(spyEmailSendCancelSubscription);
            done();
          })
          .catch(error => {
            done(error);
          });
      });
    });
    
    describe("renew a cancelled Stripe subscription twice - not sent cancellation email yet", () => {
      after(function () {
        Email.sendCancelSubscription.restore();
      });
      it("should send email first time, set flag to email sent, then not send email second time", (done) => {
        const spyEmailSendCancelSubscription = sinon.spy(Email, 'sendCancelSubscription');
        reset()
          .then(result => {
            return Client.getUrl("/renew-user", {
              id: Constants.EXISTING_USER_ID
            });
          })
          .then(response => {
            response.status.should.equal(200);
            return delay(3000);
          })
          .then(response => {
            return Subscription.getWithReceiptId(Constants.EXISTING_USER_STRIPE_RECEIPT_ID);
          })
          .then(subscription => {
            sinon.assert.calledOnce(spyEmailSendCancelSubscription);
            Email.sendCancelSubscription.resetHistory();
            subscription.receiptId.should.equal(Constants.EXISTING_USER_STRIPE_RECEIPT_ID);
            subscription.userId.should.equal(Constants.EXISTING_USER_ID);
            subscription.renewEnabled.should.equal(false);
            subscription.expirationIntentCancelled.should.equal(true);
            subscription.sentCancellationEmail.should.equal(true);
            return Client.getUrl("/renew-user", {
              id: Constants.EXISTING_USER_ID
            });
          })
          .then(response => {
            response.status.should.equal(200);
            return delay(3000);
          })
          .then(response => {
            return Subscription.getWithReceiptId(Constants.EXISTING_USER_STRIPE_RECEIPT_ID);
          })
          .then(subscription => {
            sinon.assert.notCalled(spyEmailSendCancelSubscription);
            subscription.receiptId.should.equal(Constants.EXISTING_USER_STRIPE_RECEIPT_ID);
            subscription.userId.should.equal(Constants.EXISTING_USER_ID);
            subscription.renewEnabled.should.equal(false);
            subscription.expirationIntentCancelled.should.equal(true);
            subscription.sentCancellationEmail.should.equal(true);
            done();
          })
          .catch(error => {
            done(error);
          });
      });
    });
    
    describe("renew 1 user that has both iOS and Stripe sub - iOS active, Stripe expired ", () => {
      after(function() {
        Email.sendCancelSubscription.restore();
        resetDate();
      });
      it("should not send any cancellation emails because iOS is still active", (done) => {
        const spyEmailSendCancelSubscription = sinon.spy(Email, 'sendCancelSubscription');
        changeDate("February 1, 2018 11:00:00");
        resetWithIosStripeUser()
          .then(response => {
            return Client.getUrl("/renew-user", {
              id: Constants.EXISTING_USER_ID
            })
          })
          .then(response => {
            response.status.should.equal(200);
            response.body.message.should.contain(Constants.EXISTING_USER_ID);
            return delay(4000);
          })
          .then(response => {
            sinon.assert.notCalled(spyEmailSendCancelSubscription);
            return Client.getUrl("/renew-user", {
              id: Constants.EXISTING_USER_ID
            });
          })
          .then(subscription => {
            return delay(4000);
          })
          .then(subscription => {
            sinon.assert.notCalled(spyEmailSendCancelSubscription);
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