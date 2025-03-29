const { GetObjectCommand, S3Client } = require("@aws-sdk/client-s3");
const { ParamStoreManagerUtil } = require("../utils");
const {
  IDVClient,
  SessionSpecificationBuilder,
  RequestedDocumentAuthenticityCheckBuilder,
  RequestedTextExtractionTaskBuilder,
  NotificationConfigBuilder,
  OrthogonalRestrictionsFilterBuilder,
  RequiredIdDocumentBuilder,
  SdkConfigBuilder
} = require("yoti");
const {
  SandboxIDVClientBuilder,
  SandboxBreakdownBuilder,
  SandboxRecommendationBuilder,
  SandboxDocumentAuthenticityCheckBuilder,
  SandboxCheckReportsBuilder,
  SandboxResponseConfigBuilder,
  SandboxDocumentTextDataCheckBuilder,
  SandboxTaskResultsBuilder,
  SandboxDocumentTextDataExtractionTaskBuilder,
} = require('@getyoti/sdk-sandbox');
const YotiServices = require("./yoti-services");


class YotiSandBox extends YotiServices {
  privateKey
  sdkId
  constructor(userId,environment) {
    super(environment)
    this.userId = userId;
  }
  async getPrivateKey() {
    console.log("get private key");
    //CHANGE
    // inside the bucket where you saved the pem of your yoti account
    const s3Client = new S3Client({});
    const command = new GetObjectCommand({
      Bucket: "serverless-yoti-private-access-keys",
      Key: "sandbox-privateKey.pem",
    });
    const response = await s3Client.send(command);
    this.privateKey = await response.Body?.transformToString();
    return this.privateKey;
  }
  async getSdkId() {
    console.log("get sdk id");
    //CHANGE
    // inside the param store where you saved the sdk id of your yoti account
    this.sdkId = await ParamStoreManagerUtil.getSSMParameter(
      `YOUR-PARAM-STORE-NAME`
    );
    return this.sdkId
  }

  async getIdentityVerificationInitialize() {
    console.log("get identity verification ");
    const PEM_KEY = await this.getPrivateKey();
    const YOTI_CLIENT_SDK_ID = await this.getSdkId();
    const idvClient = new IDVClient(YOTI_CLIENT_SDK_ID, PEM_KEY, {
      apiUrl: "https://api.yoti.com/sandbox/idverify/v1",
    });
    return idvClient;
  }

  async configureSessionResponse(sessionId){
    console.log("configure session response for session id ",sessionId)
    const idvClient = new SandboxIDVClientBuilder()
    .withClientSdkId(this.sdkId)
    .withPemString(this.privateKey)
    .build();

    const documentAuthenticityCheckConfig  = new SandboxDocumentAuthenticityCheckBuilder()
    .withRecommendation(
      new SandboxRecommendationBuilder().withValue('APPROVE').build()
    )
    .withBreakdown(
      new SandboxBreakdownBuilder()
        .withSubCheck('document_in_date')
        .withResult('PASS')
        .build(),
    )
    .build();

    const textDataCheckConfig = new SandboxDocumentTextDataCheckBuilder()
    .withRecommendation(
      new SandboxRecommendationBuilder().withValue('APPROVE').build(),
    )
    .withBreakdown(
      new SandboxBreakdownBuilder()
        .withSubCheck('text_data_readable')
        .withResult('PASS')
        .build(),
    )
    .withDocumentFields({
      full_name: 'John Doe',
      nationality: 'GBR',
      date_of_birth: '1986-06-01',
      document_number: '123456789',
    })
    .build();

    const textExtractionConfig = new SandboxDocumentTextDataExtractionTaskBuilder()
    .withDocumentFields({
      full_name: 'John Doe',
      nationality: 'GBR',
      date_of_birth: '1986-06-01',
      document_number: '123456789',
    })
    .build();
    const checkReportsConfig = new SandboxCheckReportsBuilder()
    .withAsyncReportDelay(5)
    .withDocumentAuthenticityCheck(documentAuthenticityCheckConfig)
    .withDocumentTextDataCheck(textDataCheckConfig)
    .build();
    const taskResultsConfig = new SandboxTaskResultsBuilder()
    .withDocumentTextDataExtractionTask(textExtractionConfig)
    .build();
    const responseConfig = new SandboxResponseConfigBuilder()
    .withCheckReports(checkReportsConfig)
    .withTaskResults(taskResultsConfig)
    .build();

    await idvClient.configureSessionResponse(sessionId, responseConfig);
  }

  async createSession() {
    const idvClient = await this.getIdentityVerificationInitialize();

    const filter = new OrthogonalRestrictionsFilterBuilder()
    .withAllowExpiredDocuments(false)
    .build()

    const requiredDocument = new RequiredIdDocumentBuilder()
    .withFilter(filter)
    .build()
  
    //Document Authenticity Check
    const documentAuthenticityCheck =
      new RequestedDocumentAuthenticityCheckBuilder()
        .withManualCheckNever()
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
    .build()

    //Buiding the Session with defined specification from above
    const sessionSpec = new SessionSpecificationBuilder()
      .withUserTrackingId(this.userId)
      .withRequestedCheck(documentAuthenticityCheck)
      .withRequestedTask(textExtractionTask)
      .withNotifications(notificationConfig)
      .withRequiredDocument(requiredDocument)
      .withSdkConfig(sdkConfig)
      .build();

    
    //create session
    const session = await idvClient.createSession(sessionSpec);
    const sessionId = session.getSessionId();
    const sessionToken = session.getClientSessionToken();
    await this.configureSessionResponse(sessionId)
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

module.exports = YotiSandBox;
