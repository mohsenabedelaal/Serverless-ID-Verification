import { AccountProperties, EnvironmentProperties } from '../../config/env.initializer';
import * as cdk from 'aws-cdk-lib';

export interface stackProps {
    stackName?:string;
    env?: AccountProperties;
    VPC_ID?: string;
    ALIAS_NAME?: string;
    rdsDbSecretName?: string;
    ACCOUNT?: AccountProperties['account'];
    REGION?: AccountProperties['region'];
}

export interface pipelineProps {
    stackName?:string;
    env?: AccountProperties;
    VPC_ID?: string;
    ALIAS_NAME?: string;
    ACCOUNT?: AccountProperties['account'];
    REGION?: AccountProperties['region'];
    config:EnvironmentProperties;
    makeConfiguredYotiCdkStack:(app: cdk.App) => cdk.Stack
}