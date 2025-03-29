import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { stackProps } from "../shared/interface/stackAndPipelineProps";
import { HTTPMETHOD } from "../constants";

export class YotiCdkStack extends cdk.Stack {
  /**
   * @param {Construct} scope
   * @param {string} id
   * @param {stackProps=} props
   */
  constructor(scope:Construct, id:string, props:stackProps) {
    super(scope, id, props);
    const {
      VPC_ID,
      rdsDbSecretName,
      ALIAS_NAME,
    } = props;

    const withPrefix = (name:String) => `serverless-Yoti-${name}`;

    console.log(`=== synthesizing YotiCdkStack ===`);
    console.log(
      JSON.stringify(
        {
          VPC_ID,
          ALIAS_NAME,
        },
        null,
        2
      )
    );

    //iam
    const secretsAccessPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "secretsmanager:GetRandomPassword",
        "secretsmanager:GetResourcePolicy",
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret",
        "ssm:GetParameter",
        "secretsmanager:ListSecretVersionIds"
      ],
      resources: ["*"],
    })

    // vpc
    console.log("VPC ID " + VPC_ID);
    const vpc = ec2.Vpc.fromLookup(this, withPrefix("VPC"), {
      vpcId: VPC_ID,
    });
    

    //CHANGE
    //this is the yoti lambda that will create the session that will give the permission for the user to check his id with
    const createSessionLambda = new lambda.Function(this,withPrefix("create-session-function"),{
      vpc:vpc,
      timeout:cdk.Duration.seconds(10),
      functionName:withPrefix("create-session"),
      code:lambda.Code.fromAsset("lambda.zip"),
      handler:'create-yoti-session.createSessionFactory',
      runtime:lambda.Runtime.NODEJS_18_X
    });

    new lambda.Alias(this, withPrefix("VersionAlias"), {
      aliasName: "createYotiSessionLambdaAlias",
      version: createSessionLambda.currentVersion,
    });

    
    /**************************************************************************
      * 
    * ************************************************************************/
    //WebHook Lambda handler
    const webhookLambda = new lambda.Function(this,withPrefix("webhook"),{
      vpc:vpc,
      timeout:cdk.Duration.seconds(10),
      functionName:withPrefix("webhook"),
      code:lambda.Code.fromAsset("lambda.zip"),
      handler:'yoti-webhook.handleYotiWebhookFactory',
      runtime:lambda.Runtime.NODEJS_18_X,
      retryAttempts:0
    });

    new lambda.Alias(this, withPrefix("yotiWebhookVersionAlias"), {
      aliasName: "yotiWebhookLambdaAlias",
      version: webhookLambda.currentVersion,
    });
   
    
    //grant the lambda secrets access
    createSessionLambda.addToRolePolicy(secretsAccessPolicy)
    
    webhookLambda.addToRolePolicy(secretsAccessPolicy)

    const apiMethodOptions = {
      authorizationType: apigateway.AuthorizationType.CUSTOM,
      apiKeyRequired:true
    };


    // define REST API
    const api = new apigateway.RestApi(this, withPrefix("API"), {
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowHeaders:['Content-Type','X-Amz-Date','Authorization','X-Api-Key','X-Amz-Security-Token','X-Amz-User-Agent','ic-auth']
      },
    });
    api.addGatewayResponse("test-response", {
      type: apigateway.ResponseType.UNAUTHORIZED,
      statusCode: "401",
      responseHeaders: {
        "Access-Control-Allow-Origin": "'*'",
      },
      templates: {
        "application/json":
          '{ "message": $context.error.messageString, "statusCode": "401", "type": "$context.error.responseType" }',
      },
    });
    const apiDeploy = new apigateway.Deployment(
      this,
      withPrefix(`Yoti-Deployment${new Date().toString()}`),
      {
        api: api,
      }
    );
    const apiStage = new apigateway.Stage(this, withPrefix("Yoti-Stage"), {
      deployment: apiDeploy,
      stageName: "serverless",
    });
    api.deploymentStage = apiStage;

    const apiKEY = "keyForYotiAPI";

    const keyForAPI = api.addApiKey(apiKEY, {
      apiKeyName: withPrefix(apiKEY),
    });
    const plan = api.addUsagePlan("UsagePlan", {
      name: withPrefix("planForYotiAPI"),
      throttle: {
        rateLimit: 3000,
        burstLimit: 1500,
      },
    });
    plan.addApiKey(keyForAPI);
    plan.addApiStage({
      stage: api.deploymentStage,
    });
    api.root.addResource("create-session").addResource("{user_id}").addMethod(
      HTTPMETHOD.POST,
      new apigateway.LambdaIntegration(createSessionLambda),
      apiMethodOptions,
    )

    // the pem for yoti saved in s3 bucket 
    const bucketName = "serverless-yoti-private-access-keys"
      let bucket:s3.IBucket;

      bucket = new s3.Bucket(this,withPrefix("yoti-private"),{
        bucketName:bucketName,
        versioned:true,
        encryption:s3.BucketEncryption.S3_MANAGED
      })

    console.log("bucket arn: " + bucket.bucketArn)
    console.log("bucket: " + bucket)
    bucket.grantReadWrite(createSessionLambda)
    bucket.grantReadWrite(webhookLambda)
  }
}

