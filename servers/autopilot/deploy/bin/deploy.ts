#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import 'source-map-support/register';

import {
  EnvironmentType,
  type Environments,
} from '@fern-fern/fern-cloud-sdk/api/resources/environments';

import { AutopilotDeployStack } from '../src/deploy-stack';

void main();

async function main() {
  const version = process.env.VERSION;
  if (version === undefined) {
    throw new Error('Version is not specified!');
  }
  const environments = await getEnvironments();
  const app = new cdk.App();
  for (const environmentType of Object.keys(environments)) {
    switch (environmentType) {
      case EnvironmentType.Dev2: {
        const dev2Info = environments[environmentType];
        if (dev2Info == null) {
          throw new Error('Unexpected error: dev2Info is undefined');
        }
        new AutopilotDeployStack(
          app,
          `autopilot-${environmentType.toLowerCase()}`,
          version,
          environmentType,
          dev2Info,
          {
            GITHUB_TOKEN: getEnvVarOrThrow('GITHUB_TOKEN'),
          },
          {
            env: { account: '985111089818', region: 'us-east-1' },
          }
        );
        break;
      }
      case EnvironmentType.Prod: {
        const prodInfo = environments[environmentType];
        if (prodInfo == null) {
          throw new Error('Unexpected error: prodInfo is undefined');
        }
        new AutopilotDeployStack(
          app,
          `autopilot-${environmentType.toLowerCase()}`,
          version,
          environmentType,
          prodInfo,
          {
            GITHUB_TOKEN: getEnvVarOrThrow('GITHUB_TOKEN'),
          },
          {
            env: { account: '985111089818', region: 'us-east-1' },
          }
        );
        break;
      }
      default:
        return;
    }
  }
}

function getEnvVarOrThrow(envVarName: string): string {
  const val = process.env[envVarName];
  if (val != null) {
    return val;
  }
  throw Error(`Expected environment variable to be defined: ${envVarName}`);
}

async function getEnvironments(): Promise<Environments> {
  const response = await fetch(
    'https://raw.githubusercontent.com/fern-api/fern-cloud/main/env-scoped-resources/environments.json',
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      },
    }
  );
  const environments = (await response.json()) as any as Environments;
  return environments;
}