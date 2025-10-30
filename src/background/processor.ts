import { EventEmitter } from 'events';
import { App } from 'octokit';
import logger from '../logger.ts';
import { dispatchWorkflow } from '../actions/index.ts';
import { getClient } from '../database/client.ts';
import {
  createWorkflowRun,
  getWorkflowRunByWorkflowId,
  updateWorkflowRunStatus
} from '../database/generated-queries/workflow_runs_sql.ts';

/**
 * Background task processor using Node.js EventEmitter
 * Processes webhook events asynchronously without blocking the main thread
 */
class BackgroundProcessor extends EventEmitter {
  private app: App;
  private activeJobs = 0;
  private maxConcurrency = 5;

  constructor(app: App) {
    super();
    this.app = app;
    this.setupHandlers();
  }

  private setupHandlers() {
    // Register event handlers for each webhook type
    this.on('push', (data) => this.processPush(data));
    this.on('workflow_run', (data) => this.processWorkflowRun(data));
  }

  /**
   * Enqueue a webhook for background processing
   * Returns immediately without blocking
   */
  async enqueue(type: string, payload: any): Promise<void> {
    // Check concurrency limit
    if (this.activeJobs >= this.maxConcurrency) {
      logger.warn(`Background processor at max concurrency (${this.maxConcurrency}), queueing ${type} event`);
    }

    // Emit event asynchronously - this returns immediately
    setImmediate(() => {
      this.emit(type, { payload, installationId: payload.installation?.id });
    });
  }

  /**
   * Process push webhook in background
   */
  private async processPush(data: { payload: any; installationId?: number }): Promise<void> {
    this.activeJobs++;
    const startTime = Date.now();

    try {
      const { payload, installationId } = data;
      const repo = payload.repository.name;
      const owner = payload.repository.owner?.login;
      const ref = payload.ref;

      if (!owner) {
        logger.error('No repository owner found in payload');
        return;
      }

      logger.info(`[Background] Processing push event for ${owner}/${repo}`);

      // Get authenticated Octokit
      const octokit = installationId
        ? await this.app.getInstallationOctokit(installationId)
        : await this.app.getInstallationOctokit(payload.installation.id);

      // Save the diff for custom code replays (only for non-PR pushes)
      await this.getDiffFromPush(octokit, data);

      // Handle any workflow runs
      const commitSha = payload.after || payload.head_commit?.id || 'unknown';
      await this.handleWorkflows(octokit, owner, repo, ref, commitSha);

      const duration = Date.now() - startTime;
      logger.info(`[Background] Completed push event in ${duration}ms`);
    } catch (error) {
      // CHRISM - should we store errors somehow and replay them all here? How to ensure other jobs run if one fails?
      logger.error('[Background] Error processing push event:', error);
    } finally {
      this.activeJobs--;
    }
  }
  // CHRISM - make committerInfo into nice struct
  private async getDiffFromPush(octokit: any, data: { payload: any; installationId?: number }) : Promise<void> {
      // CHRISM yet to cover:
      // 1. Direct pushes to main - Won't have web-flow, even if those commits were previously in a PR
      // 2. Manual CLI merges - Won't have web-flow (user performs merge locally)
      // 3. GitHub Actions/bots - Will have their own bot username, not web-flow
      // 4. Re-delivered packages come from logged in person, not from original data???

      const { payload } = data;

      // Get commit information from payload
      // CHRISM - is head commit right? probably want to cycle all of them and filter out
      const committerName = payload.head_commit?.committer?.username || payload.head_commit?.committer?.name || 'Unknown';
      
      logger.debug(`[Background] processing commit by ${committerName} in push event.`);

      // Check if commit came from a PR. If so, it will be processed elsewhere.
      const prInfo = await this.checkIfCommitFromPR(committerName);
      if (prInfo.isFromPR) {
        logger.debug(`[Background] Skipping processing for PR commit in push event.`);
        return;
      }

      // Came from direct push, parse and save the diff
      await this.parseDiffFromPush(octokit, payload);
  }

  /**
   * Parse diff from a push event
   *
   * @param octokit - Authenticated Octokit instance
   * @param payload - Push event payload
   */
  private async parseDiffFromPush(octokit: any, payload: any): Promise<void> {
    try {
      // Extract commit information from payload
      const commitSha = payload.after || payload.head_commit?.id;
      const commitMessage = payload.head_commit?.message || 'No commit message';
      const owner = payload.repository.owner?.login;
      const repo = payload.repository.name;

      if (!commitSha || !owner || !repo) {
        logger.error('[Background] Missing required information from payload to get diff');
        return;
      }

      // Log commit message first
      logger.info(`[Background] 📝 Commit message: "${commitMessage}"`);

      // Get the diff using GitHub API
      logger.info(`[Background] Fetching diff for commit ${commitSha}...`);

      const { data } = await octokit.request('GET /repos/{owner}/{repo}/commits/{ref}', {
        owner,
        repo,
        ref: commitSha,
        headers: {
          'x-github-api-version': '2022-11-28',
        },
      });

      // Log the diff information
      logger.info(`[Background] ✓ Diff retrieved for ${commitSha}`);
      logger.info(`[Background] Files changed: ${data.files?.length || 0}`);
      logger.info(`[Background] Stats: +${data.stats?.additions || 0} -${data.stats?.deletions || 0}`);

      // Log each file's changes
      if (data.files && data.files.length > 0) {
        logger.info(`[Background] Changed files:`);
        data.files.forEach((file: any) => {
          logger.info(`[Background]   - ${file.filename} (+${file.additions} -${file.deletions})`);
          if (file.patch) {
            logger.debug(`[Background] Patch for ${file.filename}:\n${file.patch}`);
          }
        });
      }

      // Return the diff data for further processing
      return data;
    } catch (error) {
      logger.error('[Background] Error parsing diff from push:', error);
      throw error;
    }
  }

  private async handleWorkflows(
    octokit: any,
    owner: string,
    repo: string,
    ref: string,
    commitSha: string
  ): Promise<void> {
    // List all workflows
    const { data: workflows } = await octokit.request('GET /repos/{owner}/{repo}/actions/workflows', {
      owner,
      repo,
      headers: { 'x-github-api-version': '2022-11-28' },
    });

    logger.info(`Found ${workflows.total_count} workflow(s) in ${owner}/${repo}`);

    // Filter SDK workflows
    const sdkWorkflows = workflows.workflows.filter((workflow: any) => {
      const nameMatch = workflow.name.toLowerCase().includes('sdk');
      const pathMatch = workflow.path.toLowerCase().includes('sdk');
      return (nameMatch || pathMatch) && workflow.state === 'active';
    });

    logger.info(`Found ${sdkWorkflows.length} SDK workflow(s) to dispatch`);

    if (sdkWorkflows.length === 0) {
      logger.info('No SDK workflows found to dispatch');
      return;
    }

    // Dispatch workflows
    await Promise.all(
      sdkWorkflows.map(async (workflow: any) => {
        try {
          await dispatchWorkflow({
            octokit,
            owner,
            repo,
            workflow: { id: workflow.id, name: workflow.name, path: workflow.path },
            ref,
            inputs: { version: '1.0.0' },
            commitSha,
          });
        } catch (error) {
          logger.error(`Failed to dispatch workflow ${workflow.name}:`, error);
        }
      })
    );
  }

  /**
   * Get commit diff from GitHub API
   *
   * @param octokit - Authenticated Octokit instance
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param commitSha - Commit SHA to get diff for
   * @returns Commit data with diff information
   */
  private async getCommitDiff(
    octokit: any,
    owner: string,
    repo: string,
    commitSha: string
  ): Promise<any> {
    try {

      
      const { data } = await octokit.request('GET /repos/{owner}/{repo}/commits/{ref}', {
        owner,
        repo,
        ref: commitSha,
        headers: {
          'x-github-api-version': '2022-11-28',
        },
      });

      logger.debug(`[Background] Commit diff retrieved for ${commitSha}`);
      logger.info(`[Background] Commit diff files ${data.files}`);

      // The response includes:
      // - data.files: array of changed files with patch/diff
      // - data.stats: { additions, deletions, total }
      // - data.commit: commit metadata

      return data;
    } catch (error) {
      logger.error(`Failed to get commit diff for ${commitSha}:`, error);
      throw error;
    }
  }

  /**
   * Get comparison/diff between two commits (for entire push)
   * Use this if you want ALL changes in a push, not just the latest commit
   *
   * @param octokit - Authenticated Octokit instance
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param baseCommit - Base commit SHA (before push)
   * @param headCommit - Head commit SHA (after push)
   * @returns Comparison data with cumulative diff
   */
  private async getCommitComparison(
    octokit: any,
    owner: string,
    repo: string,
    baseCommit: string,
    headCommit: string
  ): Promise<any> {
    try {
      const { data } = await octokit.request('GET /repos/{owner}/{repo}/compare/{basehead}', {
        owner,
        repo,
        basehead: `${baseCommit}...${headCommit}`,
        headers: {
          'x-github-api-version': '2022-11-28',
        },
      });

      logger.debug(`[Background] Comparison retrieved: ${baseCommit}...${headCommit}`);

      // The response includes:
      // - data.files: array of ALL changed files across commits
      // - data.commits: array of all commits in the range
      // - data.total_commits: number of commits

      return data;
    } catch (error) {
      logger.error(`Failed to get commit comparison ${baseCommit}...${headCommit}:`, error);
      throw error;
    }
  }

  /**
   * Check if commit came from a Pull Request
   *
   * @param commitMessage - Commit message to parse
   * @returns PR information if from a PR, otherwise indicates direct push
   * 
   */
  private async checkIfCommitFromPR(committerName: string): Promise<{ isFromPR: boolean }> {
    // Check if committer is web-flow (GitHub's merge system)
    // This is reliable for all merge strategies (merge commit, squash, rebase)
    if (committerName === 'web-flow') {
      logger.debug(`[Background] Detected PR merge via web-flow committer`);
      return { isFromPR: true };
    }

    // Not from a PR
    return { isFromPR: false };
  }

  /**
   * Process workflow_run webhook in background
   */
  private async processWorkflowRun(data: { payload: any; installationId?: number }): Promise<void> {
    this.activeJobs++;
    const startTime = Date.now();

    try {
      const { payload } = data;
      const repo = payload.repository.name;
      const owner = payload.repository.owner?.login;
      const action = payload.action;
      const workflowRun = payload.workflow_run;

      if (!owner) {
        logger.error('No repository owner found in workflow_run payload');
        return;
      }

      logger.info(`[Background] Processing workflow_run event for ${owner}/${repo}`);

      // Validate required fields
      if (!workflowRun.name || !workflowRun.head_sha || !workflowRun.head_branch) {
        logger.warn('Workflow run missing required fields, skipping');
        return;
      }

      // Filter to only track SDK workflows
      const workflowName = workflowRun.name.toLowerCase();
      const workflowPath = workflowRun.path?.toLowerCase() || '';
      const isSdkWorkflow = workflowName.includes('sdk') || workflowPath.includes('sdk');

      if (!isSdkWorkflow) {
        logger.debug(`Skipping non-SDK workflow: ${workflowRun.name}`);
        return;
      }

      logger.info(`Processing workflow_run event for SDK workflow: ${workflowRun.name} (${action})`);

      // Save/update workflow run in database
      const db = await getClient();
      const workflowRunId = workflowRun.id.toString();
      const workflowUrl = workflowRun.html_url;

      const existingRun = await getWorkflowRunByWorkflowId(db, { workflowId: workflowRunId });

      if (!existingRun) {
        const newRun = await createWorkflowRun(db, {
          workflowId: workflowRunId,
          workflowUrl,
          org: owner,
          repo
        });
        logger.info(`Saved new workflow run to database: ${workflowRun.name} (ID: ${newRun?.id})`);
      }

      // Update status and conclusion
      const statusMap: Record<string, string> = {
        'queued': 'queued',
        'in_progress': 'in_progress',
        'completed': 'completed',
        'waiting': 'waiting',
        'requested': 'requested',
        'pending': 'pending'
      };

      const dbStatus = statusMap[workflowRun.status] || 'queued';
      const conclusion = workflowRun.conclusion || null;

      await updateWorkflowRunStatus(db, {
        workflowId: workflowRunId,
        status: dbStatus,
        conclusion: conclusion
      });

      logger.info(`Updated workflow run status to: ${dbStatus}${conclusion ? `, conclusion: ${conclusion}` : ''}`);

      if (action === 'completed') {
        if (workflowRun.conclusion === 'success') {
          logger.info(`✓ SDK workflow ${workflowRun.name} completed successfully`);
        } else {
          logger.warn(`✗ SDK workflow ${workflowRun.name} completed with conclusion: ${workflowRun.conclusion}`);
        }
      }

      const duration = Date.now() - startTime;
      logger.info(`[Background] Completed workflow_run event in ${duration}ms`);
    } catch (error) {
      logger.error('[Background] Error processing workflow_run event:', error);
    } finally {
      this.activeJobs--;
    }
  }

  /**
   * Get current status of background processor
   */
  getStatus() {
    return {
      activeJobs: this.activeJobs,
      maxConcurrency: this.maxConcurrency,
    };
  }
}

let processor: BackgroundProcessor | null = null;

/**
 * Initialize the background processor
 */
export function initProcessor(app: App): BackgroundProcessor {
  if (!processor) {
    processor = new BackgroundProcessor(app);
    logger.info('Background processor initialized');
  }
  return processor;
}

/**
 * Get the background processor instance
 */
export function getProcessor(): BackgroundProcessor {
  if (!processor) {
    throw new Error('Background processor not initialized');
  }
  return processor;
}
