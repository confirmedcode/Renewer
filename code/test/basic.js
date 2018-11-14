// Chai + Server (Server must be loaded before other utilities)
const chai = require("chai");
chai.use(require("chai-http"));
const server = require("../app");
const Constants = require('./constants.js');
const { reset } = require("./utilities.js");

describe("Basic", () => {

  beforeEach(reset);
  
  describe("Health Check", () => {
    it("should respond 200 and JSON OK", (done) => {
      chai.request(server)
        .get("/health")
        .end((error, response) => {
          response.should.have.status(200);
          response.body.message.should.contain("OK from");
          done();
        });
    });
  });
  
});
