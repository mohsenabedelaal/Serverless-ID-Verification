const { GetObjectCommand, S3Client } = require("@aws-sdk/client-s3");
const {
  IDVClient,
  SessionSpecificationBuilder,
  RequestedDocumentAuthenticityCheckBuilder,
  RequestedTextExtractionTaskBuilder,
  NotificationConfigBuilder,
  SdkConfigBuilder
} = require("yoti");
const YotiServices = require("./yoti-services");

class YotiProduction extends YotiServices{
  constructor(userId,mysql,environment) {
    super(mysql,environment)
    this.userId = userId;
  }
  async getPrivateKey() {
    console.log("get private key");
    const s3Client = new S3Client({});
    const command = new GetObjectCommand({
      Bucket: this.environment + "-yoti-private-access-keys",
      Key: "prod-privateKey.pem",
    });
    const response = await s3Client.send(command);
    console.log("response => ", response);
    const PEM_KEY = await response.Body?.transformToString();
    return PEM_KEY;
  }
  async getSdkId() {
    console.log("get sdk id");
    // return await ParamStoreManagerUtil.getSSMParameter(
    //   `/environments/production/app/yoti/sdk-id`
    // );
    return "f0a52bb1-5824-41ca-886f-f1bfb41cb1a8"
  }

  async getIdentityVerificationInitialize() {
    console.log("get identity verification ");
    const PEM_KEY = await this.getPrivateKey();
    const YOTI_CLIENT_SDK_ID = await this.getSdkId();
    return new IDVClient(YOTI_CLIENT_SDK_ID, PEM_KEY ? PEM_KEY : "");
  }
  async createSession() {
    const idvClient = await this.getIdentityVerificationInitialize();
    console.log("IdvClient => ", idvClient);
    //check if user have an existing session
    const userSession = await this.getUserSession(this.userId)
    console.log("user session result => ",userSession)
    if(userSession.length > 0){
      const sessionId = userSession[0]['session_id']
      const sessionDetails = await idvClient.getSession(sessionId)
      return {
        sessionId:sessionDetails.getSessionId(),
        sessionToken:sessionDetails.getClientSessionToken()
      }
    }
    //Document Authenticity Check
    const documentAuthenticityCheck =
      new RequestedDocumentAuthenticityCheckBuilder()
        .withManualCheckAlways()
        .build();

    //ID Document Text Extraction Task with manual check set to fallback
    const textExtractionTask = new RequestedTextExtractionTaskBuilder()
      .withManualCheckFallback()
      .build();

    const webhookUrl = await this.getWebhookUrl()

    const notificationConfig = new NotificationConfigBuilder()
      .withEndpoint(
        webhookUrl
      )
      .withAuthToken("username:password")
      .forResourceUpdate()
      .forTaskCompletion()
      .forCheckCompletion()
      .forSessionCompletion()
      .build();

    console.log("notification config ", notificationConfig);

    const sdkConfig = new SdkConfigBuilder()
    .withIdDocumentTextExtractionGenericRetries(3)
    .withIdDocumentTextExtractionReclassificationRetries(3)
    .withAllowHandoff(true)
    .build()

    //Buiding the Session with defined specification from above
    const sessionSpec = new SessionSpecificationBuilder()
      .withClientSessionTokenTtl(1209600)
      .withResourcesTtl(5259456)
      .withUserTrackingId(this.userId)
      .withRequestedCheck(documentAuthenticityCheck)
      .withRequestedTask(textExtractionTask)
      .withNotifications(notificationConfig)
      .withSdkConfig(sdkConfig)
      .build();

    console.log("session spec => ", sessionSpec);

    
    //create session
    const session = await idvClient.createSession(sessionSpec);
    const sessionId = session.getSessionId();
    const sessionToken = session.getClientSessionToken();
    if(sessionId){
      await this.saveUserSession(this.userId,sessionId)
    }
    console.log(
      `session id => ${sessionId} , session token => ${sessionToken}`
    );
    await this.logEvent("yoti-session")({userId: this.userId, sessionId, sessionToken})
    return {
      sessionId: sessionId,
      sessionToken: sessionToken,
    };
  }

  async retrieveResults(sessionId) {
    const idvClient = await this.getIdentityVerificationInitialize();
    idvClient.getSession(sessionId).then(session => {
    
      // Return specific check types
      const authenticityChecks = session.getAuthenticityChecks();
      console.log("authenticityChecks ", JSON.stringify(authenticityChecks));
      
      
    }).catch(error => {
        // handle error
        console.log(`Error happened while getting results for session ${sessionId}`, error);
    })
}
  
  async handleWebhook(sessionId){
      const idvClient = await this.getIdentityVerificationInitialize();
      await this.getReport(idvClient,sessionId)
  }
}
module.exports = {
  YotiProduction
};
