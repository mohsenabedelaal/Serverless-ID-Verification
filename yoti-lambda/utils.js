const axios = require("axios");

const { SSM, GetParameterCommand } =require("@aws-sdk/client-ssm");
const {
  SecretsManager,
  GetSecretValueCommand,
} = require("@aws-sdk/client-secrets-manager");

class ParamStoreManagerUtil {
  /**
   * Uses AWS Param Store to retrieve a values
   */
  static async getSSMParameter(paramKey) {
    console.log("---Inside getSSMParameter getting paramKey:", paramKey);
    const param = {Name:paramKey,WithDecryption:false}
    const command = new GetParameterCommand(param);
    const ssm = new SSM();
    let paramStoreValue = await ssm
      .send(command)
      .then((data) => {
        console.log("value back from ssm ", data);
        console.log("ParameterStore : ", data.Parameter?.Value);
        return data.Parameter?.Value;
      })
      .catch((err) => {
        console.error(
          "An Error occured while getting public key from param store ",
          err
        );
        return "";
      });
    return paramStoreValue;
  }
}


class SecretsManagerUtil {
  /**
   * Uses AWS Secrets Manager to retrieve a secret
   */
  static async getSecret(secretName) {
    var params = {
      SecretId: secretName,
    };

    let secretsManager = new SecretsManager({
      region: "us-east-1",
    });

    try {
      const command = new GetSecretValueCommand(params);
      const result = await secretsManager.send(command);
      if (result.SecretString) return JSON.parse(result.SecretString);
      return "";
    } catch (err) {
      console.log(`error in getSecret ${secretName} : ${err}`);
      return "";
    }
  }
}

module.exports = {ParamStoreManagerUtil,SecretsManagerUtil}