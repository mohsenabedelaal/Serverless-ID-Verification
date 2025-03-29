import { SecretValue, Stack, Stage } from 'aws-cdk-lib'
import { PolicyStatement } from 'aws-cdk-lib/aws-iam'
import { CodeBuildStep, CodePipeline, CodePipelineSource, ManualApprovalStep } from 'aws-cdk-lib/pipelines'
import { Construct } from 'constructs'
import { pipelineProps } from '../shared/interface/stackAndPipelineProps'

class DeployYotiIntegrationStage extends Stage {
  constructor(scope:Construct, id:string, props:any) {
    super(scope, id, props)
    props.makeConfiguredYotiCdkStack(this)
  }
}

/**
 * The stack that defines the application pipeline
 */
export class YotiIntegrationPipelineStack extends Stack {
  constructor(scope:Construct, id:string, props:pipelineProps) {
    super(scope, id, props)

    const {
      config,
      makeConfiguredYotiCdkStack
    } = props

    console.log(`=== synthesizing YotiIntegrationPipelineStack ===`)
    console.log(JSON.stringify({
      config
    }, null, 2))

    // change the repo name to your repo if you forked the repo and added it to your account
    const synthAction = new CodeBuildStep(`Synth`, {
      input: CodePipelineSource.gitHub(`mohsenabedelaal/Serverless-ID-Verification`, config.branch, {
        authentication: SecretValue.secretsManager('cdk-pipeline-github')
      }),
      buildEnvironment: { privileged: true },
      commands: [
        'npm ci',
        'cd yoti-lambda',
        'npm install',
        'zip -r lambda.zip *',
        'mv lambda.zip ../lambda.zip',
        'cd ..',
        'npm run build',
        `DEPLOY_MODE=pipeline npx cdk synth --verbose`
      ],
      rolePolicyStatements: [new PolicyStatement({
        actions: [
          "lambda:*",
          "kms:Sign",
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey",
          "kms:*",
          "ssm:GetParameter",
          "ssm:PutParameter",
          "kms:GetPublicKey",
          "vpc:*",
          "ec2:*",
          "sts:*",
          "iam:*"
        ],
        resources: ['*']
      })]
    });

    const pipeline = new CodePipeline(this, 'Pipeline', {
      pipelineName: `serverless-YotiIntegrationPipeline`,
      selfMutation: true,
      synth: synthAction,
    })
    

    if (config.requireApproval) {
      pipeline.addStage(new DeployYotiIntegrationStage(this, 'Deploy', {
        env: config.env,
        makeConfiguredYotiCdkStack,
      }), {
        pre: [
          new ManualApprovalStep(`DeployToProduction`),
        ],
      })
    }
    else {
      pipeline.addStage(new DeployYotiIntegrationStage(this, 'Deploy', {
        env: config.env,
        makeConfiguredYotiCdkStack,
      }))
    }
  }
}

