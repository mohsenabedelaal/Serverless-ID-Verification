const { REPORT_STATUS } = require("../constants");

const { ParamStoreManagerUtil } = require("../utils");
const stringSimilarity = require('string-similarity');
class YotiServices {
  constructor(environment) {
    this.environment = environment;
  }

  async getWebhookUrl() {
    //CHANGE
    // put the parameter name where you saved the webhook url
    console.log("get wehbook url");
    const webhookUrl = await ParamStoreManagerUtil.getSSMParameter(
      `webhook-url`
    );
    return webhookUrl;
  }


  async getReport(idvClient, sessionId) {
    console.log("get report for session id => ", sessionId);
    let result, documentAttempts,sessionState,reason,reportStatus = null
    const session = await idvClient.getSession(sessionId);
    console.log("Session details => ", session);
    const checks = session.getChecks();
    console.log("Checks => ", checks);
    const resources = session.getResources()
    console.log("Resources => ",resources)
    documentAttempts = resources.getIdDocuments()
    if(documentAttempts){
      documentAttempts = documentAttempts.length
    }else {
      documentAttempts = null
    }
    sessionState = session.getState()
    console.log("session state => ",sessionState)

    const idDocuments = resources.getIdDocuments();

    const idDocumentId = checks.at(0).getResourcesUsed().at(0)

    const idDocument = idDocuments.find((id) => id.getId() === idDocumentId)
    let fullName = ''
    let similarity = 0
    if (idDocument) {
      // Returns document fields object
      const documentFields = idDocument.getDocumentFields();

      if (documentFields) {
        const documentFieldsMediaId = documentFields.getMedia().getId();

        const media = await idvClient.getMediaContent(sessionId, documentFieldsMediaId)
        const buffer = media.getContent();
        const jsonData = JSON.parse(buffer);
        console.log("extracting user data: ",jsonData)
        fullName = jsonData["full_name"]
        if (fullName) {
          //CHANGE
          // change this logic to get you userdetails from your db and compare the name with the scanned one to check
          // the similarity
          const userDetailsName = "first_name last_name"
          console.log("comparing the two names:", userDetailsName, fullName)
          similarity = stringSimilarity.compareTwoStrings(fullName.toLowerCase(), userDetailsName.toLowerCase())
          console.log("name similarity: ", similarity)
        }
      }
    }

    const recommendationValues = []
    const breakdowns = []
    checks.forEach((check) => {
      console.log("Check => ",check)
      const report = check.getReport();
      console.log("report => ", report);
      if(report){
        // Get the report recommendation
        const reportRecommendation = report.getRecommendation();
        // Get the report recommendation value
        const reportRecommendationValue = reportRecommendation.getValue();
        console.log("reportRecommendationValue ", reportRecommendationValue);
        recommendationValues.push(reportRecommendationValue)

        if (reportRecommendationValue === REPORT_STATUS.REJECT) {
          // Get the report recommendation reason
          reason = reportRecommendation.getReason();
          console.log("reportRecommendationReason ", reason);
        }

        const reportBreakdown = report.getBreakdown();
        console.log("reportBreakDown ", reportBreakdown);
        // Get result of each sub check from breakdown
        reportBreakdown.forEach((breakdown) => {
          // Get the report breakdown result

          const breakdownResult = breakdown.getResult();
          const breakdownCheck = breakdown.getSubCheck();
          if (breakdownResult === "FAIL") {
            breakdowns.push(`${breakdownCheck} ${breakdownResult}`)
          }
          console.log("result  ", result);
        });
      }
      
    });

    result = breakdowns.join(",").length > 255 ? breakdowns.join(",").substring(0,255) : breakdowns.join(",")
    if (recommendationValues.some((value) => value === REPORT_STATUS.REJECT)) {
        reportStatus = REPORT_STATUS.REJECT
    } else if (recommendationValues.some((value) => value === REPORT_STATUS.NOT_AVAILABLE)) {
      reportStatus = REPORT_STATUS.NOT_AVAILABLE
    } else {
      reportStatus = REPORT_STATUS.APPROVE
    }

    if (!reason && reportStatus === REPORT_STATUS.APPROVE) {
      reason = "success"
    } else if (!reason) {
      reason = "failed"
    }

    if (similarity < 0.5 && reportStatus === REPORT_STATUS.APPROVE) {
      reason = "failed name similarity"
    }
    //CHANGE
    // add you return value you need to return 
  }
}

module.exports = YotiServices;
