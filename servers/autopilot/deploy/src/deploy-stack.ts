import { type EnvironmentInfo, EnvironmentType } from "@fern-fern/fern-cloud-sdk/api/resources/environments";
import { Duration, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as actions from "aws-cdk-lib/aws-cloudwatch-actions";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Peer, Port, SecurityGroup, Vpc } from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import { Cluster, ContainerImage, LogDriver } from "aws-cdk-lib/aws-ecs";
import { ApplicationLoadBalancedFargateService } from "aws-cdk-lib/aws-ecs-patterns";
import { ApplicationProtocol, HttpCodeTarget } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { LogGroup } from "aws-cdk-lib/aws-logs";
import * as rds from "aws-cdk-lib/aws-rds";
import { HostedZone } from "aws-cdk-lib/aws-route53";
import { PrivateDnsNamespace } from "aws-cdk-lib/aws-servicediscovery";
import * as sns from "aws-cdk-lib/aws-sns";
import { EmailSubscription } from "aws-cdk-lib/aws-sns-subscriptions";
import type { Construct } from "constructs";

const CONTAINER_NAME = "autopilot";
const SERVICE_NAME = "autopilot";

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

    console.log("🚀 Starting Autopilot stack deployment");
    console.log(`Environment: ${environmentType}`);
    console.log(`Version: ${version}`);
    console.log(`Stack ID: ${id}`);

    console.log("\n📡 Looking up VPC...");
    const vpc = Vpc.fromLookup(this, "vpc", {
      vpcId: environmentInfo.vpcId
    });
    console.log(`✓ VPC found: ${environmentInfo.vpcId}`);

    console.log("\n🔒 Creating security group...");
    const autopilotSg = new SecurityGroup(this, "autopilot-sg", {
      securityGroupName: `autopilot-${environmentType.toLowerCase()}`,
      vpc,
      allowAllOutbound: true
    });
    autopilotSg.addIngressRule(Peer.anyIpv4(), Port.tcp(443), "allow HTTPS traffic from anywhere");
    autopilotSg.addIngressRule(Peer.ipv4(environmentInfo.vpcIpv4Cidr), Port.allTcp());
    console.log(`✓ Security group created: autopilot-${environmentType.toLowerCase()}`);

    console.log("\n🔒 Creating RDS security group...");
    const rdsSg = new SecurityGroup(this, "rds-sg", {
      securityGroupName: `autopilot-rds-${environmentType.toLowerCase()}`,
      vpc,
      allowAllOutbound: true
    });
    rdsSg.addIngressRule(Peer.ipv4(environmentInfo.vpcIpv4Cidr), Port.tcp(5432), "allow PostgreSQL from VPC");
    console.log(`✓ RDS security group created: autopilot-rds-${environmentType.toLowerCase()}`);

    const dbInstance = this.createDatabase(vpc, rdsSg, autopilotSg, environmentType);
    const databaseName = "autopilot";

    console.log("\n🏗️  Looking up ECS cluster...");
    const cluster = Cluster.fromClusterAttributes(this, "cluster", {
      clusterName: environmentInfo.ecsInfo.clusterName,
      vpc,
      securityGroups: []
    });
    console.log(`✓ Cluster found: ${environmentInfo.ecsInfo.clusterName}`);

    console.log("\n🗺️  Setting up Cloud Map namespace...");
    const cloudmapNamespaceName = environmentInfo.cloudMapNamespaceInfo.namespaceName;
    const cloudMapNamespace = PrivateDnsNamespace.fromPrivateDnsNamespaceAttributes(this, "private-cloudmap", {
      namespaceArn: environmentInfo.cloudMapNamespaceInfo.namespaceArn,
      namespaceId: environmentInfo.cloudMapNamespaceInfo.namespaceId,
      namespaceName: cloudmapNamespaceName
    });
    console.log(`✓ Cloud Map namespace: ${cloudmapNamespaceName}`);

    console.log("\n📝 Looking up CloudWatch log group...");
    const logGroup = LogGroup.fromLogGroupName(this, "log-group", environmentInfo.logGroupInfo.logGroupName);
    console.log(`✓ Log group: ${environmentInfo.logGroupInfo.logGroupName}`);

    console.log("\n🔐 Looking up SSL certificate...");
    const certificate = Certificate.fromCertificateArn(this, "certificate", environmentInfo.route53Info.certificateArn);
    console.log(`✓ Certificate ARN: ${environmentInfo.route53Info.certificateArn}`);

    console.log("\n🔔 Creating SNS topic for alerts...");
    const snsTopic = new sns.Topic(this, "autopilot-sns-topic", {
      topicName: id
    });
    snsTopic.addSubscription(new EmailSubscription("alerts@buildwithfern.com"));
    console.log(`✓ SNS topic created: ${id}`);
    console.log("✓ Email subscription added: alerts@buildwithfern.com");

    const environmentResources =
      environmentType === EnvironmentType.Prod
        ? {
            cpu: 2048,
            memoryLimitMiB: 4096,
            desiredCount: 2
          }
        : {
            cpu: 1024,
            memoryLimitMiB: 2048,
            desiredCount: 1
          };

    console.log("\n⚙️  Resource configuration:");
    console.log(`  CPU: ${environmentResources.cpu}`);
    console.log(`  Memory: ${environmentResources.memoryLimitMiB} MiB`);
    console.log(`  Desired count: ${environmentResources.desiredCount}`);

    const domainName = getServiceDomainName(environmentType, environmentInfo);
    console.log("\n🚢 Creating Fargate service...");
    console.log(`  Service name: ${SERVICE_NAME}`);
    console.log(`  Container: ${CONTAINER_NAME}`);
    console.log(`  Image: ../autopilot:${version}.tar`);
    console.log(`  Domain: ${domainName}`);
    console.log(`  Execute command enabled: ${environmentType !== EnvironmentType.Prod}`);

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
          streamPrefix: SERVICE_NAME
        }),
        environment: {
          PORT: "3001",
          LOG_LEVEL: "warn",
          DB_HOST: dbInstance.dbInstanceEndpointAddress,
          DB_PORT: dbInstance.dbInstanceEndpointPort,
          DB_NAME: databaseName,
          ...envVariables
        },
        secrets: {
          DB_USERNAME: ecs.Secret.fromSecretsManager(dbInstance.secret!, "username"),
          DB_PASSWORD: ecs.Secret.fromSecretsManager(dbInstance.secret!, "password")
        }
      },
      assignPublicIp: true,
      publicLoadBalancer: true,
      enableECSManagedTags: true,
      enableExecuteCommand: environmentType !== EnvironmentType.Prod,
      protocol: ApplicationProtocol.HTTPS,
      certificate,
      domainZone: HostedZone.fromHostedZoneAttributes(this, "zoneId", {
        hostedZoneId: environmentInfo.route53Info.hostedZoneId,
        zoneName: environmentInfo.route53Info.hostedZoneName
      }),
      domainName,
      cloudMapOptions:
        cloudMapNamespace != null
          ? {
              cloudMapNamespace,
              name: SERVICE_NAME
            }
          : undefined
    });
    console.log("✓ Fargate service created");

    console.log("\n🏥 Configuring health checks...");
    fargateService.targetGroup.setAttribute("deregistration_delay.timeout_seconds", "30");
    fargateService.targetGroup.configureHealthCheck({
      healthyHttpCodes: "200,204",
      path: "/health",
      port: "3001"
    });
    console.log("✓ Health check configured: /health (200,204)");

    console.log("\n⏰ Creating CloudWatch alarms...");

    const lbResponseTimeAlarm = new cloudwatch.Alarm(
      this,
      `autopilot-${environmentType.toLowerCase()}-lb-target-response-time-alarm`,
      {
        alarmName: `${id} Load Balancer Target Response Time Threshold`,
        metric: fargateService.loadBalancer.metrics.targetResponseTime(),
        threshold: 1,
        evaluationPeriods: 5
      }
    );
    lbResponseTimeAlarm.addAlarmAction(new actions.SnsAction(snsTopic));
    console.log("✓ Response time alarm created (threshold: 1s)");

    const lbUnhealthyHostCountAlarm = new cloudwatch.Alarm(
      this,
      `autopilot-${environmentType.toLowerCase()}-lb-unhealthy-host-count-alarm`,
      {
        alarmName: `${id} Load Balancer Unhealthy Host Count Alarm`,
        metric: fargateService.targetGroup.metrics.unhealthyHostCount(),
        threshold: 1,
        evaluationPeriods: 5
      }
    );
    lbUnhealthyHostCountAlarm.addAlarmAction(new actions.SnsAction(snsTopic));
    console.log("✓ Unhealthy host count alarm created (threshold: 1)");

    const lb500CountAlarm = new cloudwatch.Alarm(this, `autopilot-${environmentType.toLowerCase()}-lb-500x-count`, {
      alarmName: `${id} Load Balancer 500 Error Alarm`,
      metric: fargateService.loadBalancer.metrics.httpCodeTarget(HttpCodeTarget.TARGET_5XX_COUNT),
      threshold: 2,
      evaluationPeriods: 5
    });
    lb500CountAlarm.addAlarmAction(new actions.SnsAction(snsTopic));
    console.log("✓ 500 error alarm created (threshold: 2)");

    console.log("\n✅ Stack deployment configuration complete!");
    console.log(`📍 Service will be available at: https://${domainName}`);
  }

  private createDatabase(
    vpc: ec2.IVpc,
    rdsSg: SecurityGroup,
    autopilotSg: SecurityGroup,
    environmentType: EnvironmentType
  ): rds.DatabaseInstance {
    console.log("\n🗄️  Creating RDS PostgreSQL instance...");
    const databaseName = "autopilot";
    const dbUsername = "autopilot_app";

    const dbInstance = new rds.DatabaseInstance(this, "autopilot-db-instance", {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15_5
      }),
      instanceType: environmentType === EnvironmentType.Prod
        ? ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.SMALL)
        : ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
      vpc,
      securityGroups: [rdsSg],
      allocatedStorage: 100,
      maxAllocatedStorage: 200,
      storageType: rds.StorageType.GP3,
      databaseName,
      credentials: rds.Credentials.fromGeneratedSecret(dbUsername, {
        secretName: `autopilot-db-credentials-${environmentType.toLowerCase()}`
      }),
      removalPolicy: environmentType === EnvironmentType.Prod ? RemovalPolicy.SNAPSHOT : RemovalPolicy.DESTROY,
      deletionProtection: environmentType === EnvironmentType.Prod,
      backupRetention: environmentType === EnvironmentType.Prod
        ? Duration.days(7)
        : Duration.days(1),
      publiclyAccessible: false,
      cloudwatchLogsExports: ["postgresql"],
      storageEncrypted: true,
      multiAz: environmentType === EnvironmentType.Prod
    });

    // Allow Fargate tasks to connect to RDS
    dbInstance.connections.allowFrom(autopilotSg, Port.tcp(5432), "Allow Fargate tasks to connect to RDS");

    console.log(`✓ RDS instance created: ${databaseName}`);
    console.log(`✓ Instance type: ${environmentType === EnvironmentType.Prod ? 't4g.small' : 't4g.micro'}`);
    console.log(`✓ Storage: 100GB (GP3, auto-scaling up to 200GB)`);
    console.log(`✓ Default database: ${databaseName}`);
    console.log(`✓ Database user: ${dbUsername}`);
    console.log(`✓ Credentials stored in Secrets Manager: autopilot-db-credentials-${environmentType.toLowerCase()}`);

    return dbInstance;
  }
}

function getServiceDomainName(environmentType: EnvironmentType, environmentInfo: EnvironmentInfo) {
  if (environmentType === EnvironmentType.Prod) {
    return `autopilot.${environmentInfo.route53Info.hostedZoneName}`;
  }
  return `autopilot-${environmentType.toLowerCase()}.${environmentInfo.route53Info.hostedZoneName}`;
}
