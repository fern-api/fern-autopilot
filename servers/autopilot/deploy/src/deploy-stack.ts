import {
    type EnvironmentInfo,
    EnvironmentType,
  } from '@fern-fern/fern-cloud-sdk/api/resources/environments';
  import { Stack, type StackProps } from 'aws-cdk-lib';
  import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
  import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
  import * as actions from 'aws-cdk-lib/aws-cloudwatch-actions';
  import { Peer, Port, SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2';
  import { Cluster, ContainerImage, LogDriver } from 'aws-cdk-lib/aws-ecs';
  import { ApplicationLoadBalancedFargateService } from 'aws-cdk-lib/aws-ecs-patterns';
  import { ApplicationProtocol, HttpCodeTarget } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
  import { LogGroup } from 'aws-cdk-lib/aws-logs';
  import { HostedZone } from 'aws-cdk-lib/aws-route53';
  import { PrivateDnsNamespace } from 'aws-cdk-lib/aws-servicediscovery';
  import * as sns from 'aws-cdk-lib/aws-sns';
  import { EmailSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
  import type { Construct } from 'constructs';
  
  const CONTAINER_NAME = 'autopilot';
  const SERVICE_NAME = 'autopilot';
  
  export interface AutopilotEnvVariables {
    GITHUB_TOKEN: string;
    PORT?: string;
    [key: string]: string | undefined;
  }
  
  export class AutopilotDeployStack extends Stack {
    constructor(
      scope: Construct,
      id: string,
      version: string,
      environmentType: EnvironmentType,
      environmentInfo: EnvironmentInfo,
      envVariables: AutopilotEnvVariables,
      props?: StackProps
    ) {
      super(scope, id, props);
  
      const vpc = Vpc.fromLookup(this, 'vpc', {
        vpcId: environmentInfo.vpcId,
      });
  
      const autopilotSg = new SecurityGroup(this, 'autopilot-sg', {
        securityGroupName: `autopilot-${environmentType.toLowerCase()}`,
        vpc,
        allowAllOutbound: true,
      });
      autopilotSg.addIngressRule(Peer.anyIpv4(), Port.tcp(443), 'allow HTTPS traffic from anywhere');
      autopilotSg.addIngressRule(Peer.ipv4(environmentInfo.vpcIpv4Cidr), Port.allTcp());
  
      const cluster = Cluster.fromClusterAttributes(this, 'cluster', {
        clusterName: environmentInfo.ecsInfo.clusterName,
        vpc,
        securityGroups: [],
      });
  
      const cloudmapNamespaceName = environmentInfo.cloudMapNamespaceInfo.namespaceName;
      const cloudMapNamespace = PrivateDnsNamespace.fromPrivateDnsNamespaceAttributes(
        this,
        'private-cloudmap',
        {
          namespaceArn: environmentInfo.cloudMapNamespaceInfo.namespaceArn,
          namespaceId: environmentInfo.cloudMapNamespaceInfo.namespaceId,
          namespaceName: cloudmapNamespaceName,
        }
      );
  
      const logGroup = LogGroup.fromLogGroupName(
        this,
        'log-group',
        environmentInfo.logGroupInfo.logGroupName
      );
  
      const certificate = Certificate.fromCertificateArn(
        this,
        'certificate',
        environmentInfo.route53Info.certificateArn
      );
  
      const snsTopic = new sns.Topic(this, 'autopilot-sns-topic', {
        topicName: id,
      });
      snsTopic.addSubscription(new EmailSubscription('alerts@buildwithfern.com'));
  
      const environmentResources =
        environmentType === EnvironmentType.Prod
          ? {
              cpu: 2048,
              memoryLimitMiB: 4096,
              desiredCount: 2,
            }
          : {
              cpu: 1024,
              memoryLimitMiB: 2048,
              desiredCount: 1,
            };
  
      const fargateService = new ApplicationLoadBalancedFargateService(this, SERVICE_NAME, {
        serviceName: SERVICE_NAME,
        cluster,
        ...environmentResources,
        securityGroups: [autopilotSg],
        taskImageOptions: {
          image: ContainerImage.fromTarball(`../autopilot:${version}.tar`),
          containerName: CONTAINER_NAME,
          containerPort: 3001,
          enableLogging: true,
          logDriver: LogDriver.awsLogs({
            logGroup,
            streamPrefix: SERVICE_NAME,
          }),
          environment: {
            PORT: '3001',
            ...envVariables,
          },
        },
        assignPublicIp: true,
        publicLoadBalancer: true,
        enableECSManagedTags: true,
        enableExecuteCommand: environmentType !== EnvironmentType.Prod,
        protocol: ApplicationProtocol.HTTPS,
        certificate,
        domainZone: HostedZone.fromHostedZoneAttributes(this, 'zoneId', {
          hostedZoneId: environmentInfo.route53Info.hostedZoneId,
          zoneName: environmentInfo.route53Info.hostedZoneName,
        }),
        domainName: getServiceDomainName(environmentType, environmentInfo),
        cloudMapOptions:
          cloudMapNamespace != null
            ? {
                cloudMapNamespace,
                name: SERVICE_NAME,
              }
            : undefined,
      });
  
      fargateService.targetGroup.setAttribute('deregistration_delay.timeout_seconds', '30');
  
      fargateService.targetGroup.configureHealthCheck({
        healthyHttpCodes: '200,204',
        path: '/health',
        port: '3001',
      });
  
      const lbResponseTimeAlarm = new cloudwatch.Alarm(
        this,
        `autopilot-${environmentType.toLowerCase()}-lb-target-response-time-alarm`,
        {
          alarmName: `${id} Load Balancer Target Response Time Threshold`,
          metric: fargateService.loadBalancer.metrics.targetResponseTime(),
          threshold: 1,
          evaluationPeriods: 5,
        }
      );
      lbResponseTimeAlarm.addAlarmAction(new actions.SnsAction(snsTopic));
  
      const lbUnhealthyHostCountAlarm = new cloudwatch.Alarm(
        this,
        `autopilot-${environmentType.toLowerCase()}-lb-unhealthy-host-count-alarm`,
        {
          alarmName: `${id} Load Balancer Unhealthy Host Count Alarm`,
          metric: fargateService.targetGroup.metrics.unhealthyHostCount(),
          threshold: 1,
          evaluationPeriods: 5,
        }
      );
      lbUnhealthyHostCountAlarm.addAlarmAction(new actions.SnsAction(snsTopic));
  
      const lb500CountAlarm = new cloudwatch.Alarm(
        this,
        `autopilot-${environmentType.toLowerCase()}-lb-500x-count`,
        {
          alarmName: `${id} Load Balancer 500 Error Alarm`,
          metric: fargateService.loadBalancer.metrics.httpCodeTarget(HttpCodeTarget.TARGET_5XX_COUNT),
          threshold: 2,
          evaluationPeriods: 5,
        }
      );
      lb500CountAlarm.addAlarmAction(new actions.SnsAction(snsTopic));
    }
  }
  
  function getServiceDomainName(environmentType: EnvironmentType, environmentInfo: EnvironmentInfo) {
    if (environmentType === EnvironmentType.Prod) {
      return `autopilot.${environmentInfo.route53Info.hostedZoneName}`;
    }
    return `autopilot-${environmentType.toLowerCase()}.${environmentInfo.route53Info.hostedZoneName}`;
  }