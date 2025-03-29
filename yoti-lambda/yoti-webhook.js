const { HTTP_STATUS_CODE,ENVIRONMENT } = require("./constants");
const YotiIntegration = require("./yoti-integration");

const handleYotiWebhookFactory = async (event, context) => {
  console.log("Webhook received:", event);
  let environment = ENVIRONMENT.PRODUCTION
  let responseApi = {
    statusCode: 200,
    body: "",
    isBase64Encoded: false,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  };
  
  if(!event || !event.body){
    console.log("Not event or event body")
    responseApi.statusCode = HTTP_STATUS_CODE.BAD_REQUEST
    responseApi.body = JSON.stringify({
      message : "Issue occured during processing your request. "
    })
    return responseApi
  }
  const body = JSON.parse(event.body)
  console.log(`Body : ${JSON.stringify(body)}`)
	const topic = body.topic
	const sessionId = body.session_id
  console.log("sessionId => ",sessionId)
  if (!sessionId || sessionId === "null") {
    console.log("session Id not found ")
    responseApi.statusCode = HTTP_STATUS_CODE.BAD_REQUEST;
    responseApi.body = JSON.stringify({
      message: "Session id not found or not passed",
    });
  }
  if(topic && topic == "session_completion"){
    const yotiIntegration = new YotiIntegration(environment, null);
    const yotiResponse = await yotiIntegration.handleWebhook(sessionId);
    console.log("yoti response ==> ", yotiResponse);
    responseApi.body = JSON.stringify({
      message: "Webhook handled",
    });
    responseApi.statusCode = HTTP_STATUS_CODE.COMPLETED;
    return responseApi;
  }
  responseApi.statusCode = HTTP_STATUS_CODE.COMPLETED
  responseApi.body = JSON.stringify({
    message:"Done"
  })
  return responseApi
  
};

module.exports = { handleYotiWebhookFactory };
