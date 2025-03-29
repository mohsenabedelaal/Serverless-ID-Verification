const { HTTP_STATUS_CODE,ENVIRONMENT } = require("./constants");
const YotiIntegration = require("./yoti-integration");

const createSessionFactory = async (event, context) => {
  let environment = ENVIRONMENT.PRODUCTION
  console.log("event ",event)
  let userId;
  let responseApi = {
    statusCode: 200,
    body: "",
    isBase64Encoded: false,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  };
  //get user id from the path parameter
  userId = event.pathParameters?.user_id;
  if (!userId || userId === "null") {
    responseApi.statusCode = HTTP_STATUS_CODE.BAD_REQUEST;
    responseApi.body = JSON.stringify({
      message: "In the path Parameter must include user",
    });
    return responseApi;
  }
  
  const yotiIntegration = new YotiIntegration(environment, userId);
  const yotiResponse = await yotiIntegration.createSession();
  responseApi.body = JSON.stringify({
    message: "Session created",
    "session":yotiResponse
  });
  responseApi.statusCode = HTTP_STATUS_CODE.CREATED;
  return responseApi;
};

module.exports = { createSessionFactory };
