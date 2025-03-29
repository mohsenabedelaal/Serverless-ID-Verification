const { ENVIRONMENT } = require("./constants");
const { YotiProduction } = require("./services/yoti-prod");
const YotiSandBox = require("./services/yoti-sandbox");

class YotiIntegration {
  constructor(environment, userId) {
    this.environment = environment;
    this.userId = userId;
  }
  async createSession() {
    console.log("environment => ", this.environment);
    let yoti;
    if (this.environment === ENVIRONMENT.PRODUCTION) {
        console.log("yoti production initialized")
      yoti = new YotiProduction(this.userId,this.environment);
    } else {
        console.log("yoti sandbox initialized")
      yoti = new YotiSandBox(this.userId,this.environment);
    }
    const resp = await yoti.createSession();
    return {
      id:resp.sessionId,
      token:resp.sessionToken
    }
  }
  async handleWebhook(sessionId) {
    console.log("webhook invoked")
    console.log("Session Id => ",sessionId)
    console.log("environment => ", this.environment);
    let yoti;
    if (this.environment === ENVIRONMENT.PRODUCTION) {
        console.log("yoti production initialized")
      yoti = new YotiProduction(this.userId,this.environment);
    } else {
        console.log("yoti sandbox initialized")
      yoti = new YotiSandBox(this.userId,this.environment);
    }
    const resp = await yoti.handleWebhook(sessionId);
    return 
  }

  async retrieveResults(sessionId) {
    console.log("environment => ", this.environment);
    let yoti;
    if (this.environment === ENVIRONMENT.PRODUCTION ) {
        console.log("yoti production initialized")
      yoti = new YotiProduction(this.userId, this.mysql, this.environment);
    } else {
        console.log("yoti sandbox initialized")
      yoti = new YotiSandBox(this.userId, this.mysql, this.environment);
    }
    const resp = await yoti.retrieveResults(sessionId);
    console.log(JSON.stringify(resp))
    return {
      checks:resp.checks[0]
    }
  }
}

module.exports = YotiIntegration;
