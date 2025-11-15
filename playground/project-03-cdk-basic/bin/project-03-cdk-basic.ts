#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { Project03CdkBasicStack } from '../lib/project-03-cdk-basic-stack';

const app = new cdk.App();
new Project03CdkBasicStack(app, 'Project03CdkBasicStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT || '000000000000',
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
});
