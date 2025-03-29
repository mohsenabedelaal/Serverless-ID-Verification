#!/usr/bin/env node

import * as cdk from 'aws-cdk-lib';
import {YotiCdkStack} from '../lib/yoti-cdk-stack';
import {YotiIntegrationPipelineStack} from '../lib/pipeline-stack'
import {environments} from '../config/env.initializer'

const validDeployModes = ['pipeline', 'direct']

const DEPLOY_MODE = process.env.DEPLOY_MODE


//@ts-ignore
const config = environments['production']
console.log(config)


const launchDeployment = async () => {

    const app = new cdk.App();
    const makeConfiguredYotiCdkStack = (app:cdk.App) => {
        const stackName = "serverless-YotiIntegration"
        return new YotiCdkStack(app, stackName, {
            stackName, // ensure stack name stays consistent across deploys. Otherwise CodePipeline prefixes this.
            env: config.env,
            VPC_ID: config.vpcId,
            ALIAS_NAME: config.alias_name,
            ACCOUNT: config.env.account,
            REGION: config.env.region,
        })
    }

    if (DEPLOY_MODE === 'pipeline') {
        new YotiIntegrationPipelineStack(app, "serverless-YotiIntegrationPipeline", {
            config,
            env: config.env,
            VPC_ID: config.vpcId,
            makeConfiguredYotiCdkStack
        })
    } else if (DEPLOY_MODE === 'direct') {
    makeConfiguredYotiCdkStack(app)
    } else {
        throw new Error(`Must set DEPLOY_MODE to one of <${validDeployModes.join(',')}>`)
    }
}

try {
    launchDeployment().catch(e => {
      console.log("Exception has occured while running the build: ", e)
      process.exit(1);
    })
  }
  catch (e) {
    console.log("Exception has occured while running the build: ", e)
    process.exit(1);
  }
