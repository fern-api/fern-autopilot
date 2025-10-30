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
import { AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId } from "aws-cdk-lib/custom-resources";
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
    const vpcName = environmentType === EnvironmentType.Prod ? "fern prod" : "fern dev";
    const vpc = Vpc.fromLookup(this, vpcName, {
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
    const logGroupName = environmentInfo.logGroupInfo.logGroupName;
    const logGroup = LogGroup.fromLogGroupName(this, "log-group", logGroupName);
    console.log(`✓ Log group: ${logGroupName}`);

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

    // Create migration task definition and runner
    console.log("\n🔄 Setting up database migration task...");
    const migrationRunner = this.createMigrationRunner(
      vpc,
      cluster,
      autopilotSg,
      logGroupName,
      version,
      dbInstance,
      databaseName,
      envVariables,
      environmentType
    );
    console.log("✓ Migration task configured");

    const domainName = getServiceDomainName(environmentType, environmentInfo);
    console.log("\n🚢 Creating Fargate task definition with health check...");
    console.log(`  Container: ${CONTAINER_NAME}`);
    console.log(`  Image: ../autopilot:${version}.tar`);

    // Create task definition manually to configure health check
    const taskDefinition = new ecs.FargateTaskDefinition(this, "TaskDef", {
      ...environmentResources
    });

    // Grant access to secrets
    dbInstance.secret?.grantRead(taskDefinition.taskRole);

    // Add container with health check
    taskDefinition.addContainer(CONTAINER_NAME, {
      image: ContainerImage.fromTarball(`../autopilot:${version}.tar`),
      containerName: CONTAINER_NAME,
      portMappings: [{ containerPort: 3001 }],
      logging: LogDriver.awsLogs({
        streamPrefix: SERVICE_NAME,
        logGroupName: logGroupName
      }),
      environment: {
        PORT: "3001",
        LOG_LEVEL: "warn",
        NODE_ENV: "production",
        DB_HOST: dbInstance.dbInstanceEndpointAddress,
        DB_PORT: dbInstance.dbInstanceEndpointPort,
        DB_NAME: databaseName,
        ...envVariables
      },
      secrets: {
        DB_USER: ecs.Secret.fromSecretsManager(dbInstance.secret!, "username"),
        DB_PASSWORD: ecs.Secret.fromSecretsManager(dbInstance.secret!, "password")
      },
      healthCheck: {
        command: ["CMD-SHELL", "node -e \"require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})\""],
        interval: Duration.seconds(30),
        timeout: Duration.seconds(5),
        retries: 3,
        startPeriod: Duration.seconds(60)
      }
    });
    console.log("✓ Task definition created with container health check");

    console.log("\n🚢 Creating Fargate service...");
    console.log(`  Service name: ${SERVICE_NAME}`);
    console.log(`  Domain: ${domainName}`);
    console.log(`  Execute command enabled: ${environmentType !== EnvironmentType.Prod}`);

    const fargateService = new ApplicationLoadBalancedFargateService(this, SERVICE_NAME, {
      serviceName: SERVICE_NAME,
      cluster,
      taskDefinition,
      securityGroups: [autopilotSg],
      taskSubnets: {
        subnetType: ec2.SubnetType.PUBLIC
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

    // Make the Fargate service depend on migration completion
    fargateService.node.addDependency(migrationRunner);
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
        version: rds.PostgresEngineVersion.VER_16_6
      }),
      instanceType: environmentType === EnvironmentType.Prod
        ? ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MEDIUM)
        : ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.SMALL),
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC
      },
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
    console.log(`✓ Instance type: ${environmentType === EnvironmentType.Prod ? 't4g.medium' : 't4g.small'}`);
    console.log(`✓ PostgreSQL version: 16.6`);
    console.log(`✓ Storage: 100GB (GP3, auto-scaling up to 200GB)`);
    console.log(`✓ Default database: ${databaseName}`);
    console.log(`✓ Database user: ${dbUsername}`);
    console.log(`✓ Credentials stored in Secrets Manager: autopilot-db-credentials-${environmentType.toLowerCase()}`);

    return dbInstance;
  }

  private createMigrationRunner(
    vpc: ec2.IVpc,
    cluster: ecs.ICluster,
    securityGroup: SecurityGroup,
    logGroupName: string,
    version: string,
    dbInstance: rds.DatabaseInstance,
    databaseName: string,
    envVariables: AutopilotEnvVariables,
    environmentType: EnvironmentType
  ): AwsCustomResource {
    // Create task definition for migration
    const migrationTaskDef = new ecs.FargateTaskDefinition(this, "MigrationTaskDef", {
      cpu: 512,
      memoryLimitMiB: 1024
    });

    // Grant access to secrets
    dbInstance.secret?.grantRead(migrationTaskDef.taskRole);

    // Add container for migration
    migrationTaskDef.addContainer("migration-container", {
      image: ContainerImage.fromTarball(`../autopilot:${version}.tar`),
      logging: LogDriver.awsLogs({
        logGroupName,
        streamPrefix: "migration"
      }),
      environment: {
        PORT: "3001",
        LOG_LEVEL: "info",
        DB_HOST: dbInstance.dbInstanceEndpointAddress,
        DB_PORT: dbInstance.dbInstanceEndpointPort,
        DB_NAME: databaseName,
        ...envVariables
      },
      secrets: {
        DB_USERNAME: ecs.Secret.fromSecretsManager(dbInstance.secret!, "username"),
        DB_PASSWORD: ecs.Secret.fromSecretsManager(dbInstance.secret!, "password")
      },
      command: ["pnpm", "db:migrate:up"]
    });

    // Get public subnets
    const publicSubnets = vpc.publicSubnets.map((subnet) => subnet.subnetId);

    // Run the migration task using AwsCustomResource
    const runTaskResource = new AwsCustomResource(this, "RunMigrationTask", {
      onCreate: {
        service: "ECS",
        action: "runTask",
        parameters: {
          cluster: cluster.clusterName,
          taskDefinition: migrationTaskDef.taskDefinitionArn,
          launchType: "FARGATE",
          networkConfiguration: {
            awsvpcConfiguration: {
              subnets: publicSubnets,
              securityGroups: [securityGroup.securityGroupId],
              assignPublicIp: "ENABLED"
            }
          }
        },
        physicalResourceId: PhysicalResourceId.fromResponse("tasks.0.taskArn")
      },
      onUpdate: {
        service: "ECS",
        action: "runTask",
        parameters: {
          cluster: cluster.clusterName,
          taskDefinition: migrationTaskDef.taskDefinitionArn,
          launchType: "FARGATE",
          networkConfiguration: {
            awsvpcConfiguration: {
              subnets: publicSubnets,
              securityGroups: [securityGroup.securityGroupId],
              assignPublicIp: "ENABLED"
            }
          }
        },
        physicalResourceId: PhysicalResourceId.fromResponse("tasks.0.taskArn")
      },
      policy: AwsCustomResourcePolicy.fromSdkCalls({
        resources: AwsCustomResourcePolicy.ANY_RESOURCE
      }),
      timeout: Duration.minutes(15)
    });

    // Grant the custom resource permission to pass roles
    migrationTaskDef.taskRole.grantPassRole(runTaskResource.grantPrincipal);
    migrationTaskDef.executionRole!.grantPassRole(runTaskResource.grantPrincipal);

    // Wait for the task to complete using a waiter
    const waitForTaskResource = new AwsCustomResource(this, "WaitForMigrationTask", {
      onCreate: {
        service: "ECS",
        action: "waitFor",
        parameters: {
          waiterName: "TasksStopped",
          cluster: cluster.clusterName,
          tasks: [runTaskResource.getResponseField("tasks.0.taskArn")]
        },
        physicalResourceId: PhysicalResourceId.of("migration-wait-" + Date.now())
      },
      onUpdate: {
        service: "ECS",
        action: "waitFor",
        parameters: {
          waiterName: "TasksStopped",
          cluster: cluster.clusterName,
          tasks: [runTaskResource.getResponseField("tasks.0.taskArn")]
        },
        physicalResourceId: PhysicalResourceId.of("migration-wait-" + Date.now())
      },
      policy: AwsCustomResourcePolicy.fromSdkCalls({
        resources: AwsCustomResourcePolicy.ANY_RESOURCE
      }),
      timeout: Duration.minutes(15)
    });

    waitForTaskResource.node.addDependency(runTaskResource);

    // Check task exit code
    const checkTaskResource = new AwsCustomResource(this, "CheckMigrationTaskStatus", {
      onCreate: {
        service: "ECS",
        action: "describeTasks",
        parameters: {
          cluster: cluster.clusterName,
          tasks: [runTaskResource.getResponseField("tasks.0.taskArn")]
        },
        physicalResourceId: PhysicalResourceId.of("migration-check-" + Date.now())
      },
      onUpdate: {
        service: "ECS",
        action: "describeTasks",
        parameters: {
          cluster: cluster.clusterName,
          tasks: [runTaskResource.getResponseField("tasks.0.taskArn")]
        },
        physicalResourceId: PhysicalResourceId.of("migration-check-" + Date.now())
      },
      policy: AwsCustomResourcePolicy.fromSdkCalls({
        resources: AwsCustomResourcePolicy.ANY_RESOURCE
      })
    });

    checkTaskResource.node.addDependency(waitForTaskResource);

    // Make sure migration runs after DB is created
    runTaskResource.node.addDependency(dbInstance);

    return checkTaskResource;
  }
}

function getServiceDomainName(environmentType: EnvironmentType, environmentInfo: EnvironmentInfo) {
  if (environmentType === EnvironmentType.Prod) {
    return `autopilot.${environmentInfo.route53Info.hostedZoneName}`;
  }
  return `autopilot-${environmentType.toLowerCase()}.${environmentInfo.route53Info.hostedZoneName}`;
}
