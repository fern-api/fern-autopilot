import { App } from 'octokit';

import logger from '../logger.ts';
import { getProcessor } from '../background/index.ts';

// This function registers all webhook event handlers on the app instance
export function registerWebhookHandlers(app: App) {
  // Log all incoming webhook events minimally
  app.webhooks.onAny(({ id, name, payload }) => {
    let repo = "N/A";
    let owner = "N/A";

    if ("repository" in payload && payload.repository) {
      repo = payload.repository.name;
      if ("owner" in payload.repository && payload.repository.owner) {
        owner = payload.repository.owner.login;
      }
    }

    logger.info(`Event: ${name} | Repo: ${owner}/${repo} | ID: ${id}`);
  });

  // This adds an event handler for push events.
  // Dispatches to background processor (non-blocking).
  app.webhooks.on('push', async ({ payload }) => {
    // Log the entire payload at debug level
    logger.debug('Push event payload:', JSON.stringify(payload, null, 2));

    // Process in background - returns immediately (non-blocking)
    const processor = getProcessor();
    await processor.enqueue('push', payload);
  });

  // This adds an event handler for workflow_run events.
  // Dispatches to background processor (non-blocking).
  app.webhooks.on('workflow_run', async ({ payload }) => {
    // Process in background - returns immediately (non-blocking)
    const processor = getProcessor();
    await processor.enqueue('workflow_run', payload);
  });

  // This adds an event handler for workflow_dispatch events.
  // Logs when a workflow is manually triggered via workflow_dispatch.
  app.webhooks.on("workflow_dispatch", async ({ octokit, payload }) => {
    const repo = payload.repository.name;
    const owner = payload.repository.owner?.login;
    const workflow = payload.workflow;
    const ref = payload.ref;

    if (!owner) {
      logger.error("No repository owner found in workflow_dispatch payload");
      return;
    }

    logger.info(`Workflow dispatch event - Workflow: ${workflow}, Ref: ${ref}, Repo: ${owner}/${repo}`);
    logger.debug("Workflow dispatch payload:", JSON.stringify(payload, null, 2));

    try {
      // You can add custom logic here to track manually dispatched workflows
      // For example, storing the dispatch event in a database or triggering other actions

      const workflowName = workflow?.toLowerCase() || "";
      const isSdkWorkflow = workflowName.includes("sdk");

      if (isSdkWorkflow) {
        logger.info(`SDK workflow "${workflow}" was manually dispatched on ${ref}`);
      }
    } catch (error) {
      if (error && typeof error === "object" && "response" in error) {
        const err = error as { response?: { status: number; data: { message: string } } };
        if (err.response) {
          logger.error(
            `Error processing workflow_dispatch! Status: ${err.response.status}. Message: ${err.response.data.message}`
          );
        }
      }
      logger.error("Error processing workflow_dispatch event:", error);
    }
  });

  logger.info("Webhook handlers registered");
}
