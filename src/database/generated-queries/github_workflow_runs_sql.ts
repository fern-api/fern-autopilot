import { QueryArrayConfig, QueryArrayResult } from "pg";

interface Client {
    query: (config: QueryArrayConfig) => Promise<QueryArrayResult>;
}

export const createGithubWorkflowRunQuery = `-- name: CreateGithubWorkflowRun :one
INSERT INTO github_workflow_runs (
    generator_run_id,
    org_name,
    repo_name,
    workflow_id,
    workflow_run_id,
    workflow_name,
    workflow_url,
    status,
    conclusion,
    commit_sha,
    branch
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
) RETURNING id, generator_run_id, org_name, repo_name, workflow_id, workflow_run_id, workflow_name, workflow_url, status, conclusion, commit_sha, branch, created_at, updated_at`;

export interface CreateGithubWorkflowRunArgs {
    generatorRunId: number | null;
    orgName: string;
    repoName: string;
    workflowId: string;
    workflowRunId: string;
    workflowName: string;
    workflowUrl: string;
    status: string;
    conclusion: string | null;
    commitSha: string;
    branch: string | null;
}

export interface CreateGithubWorkflowRunRow {
    id: number;
    generatorRunId: number | null;
    orgName: string;
    repoName: string;
    workflowId: string;
    workflowRunId: string;
    workflowName: string;
    workflowUrl: string;
    status: string;
    conclusion: string | null;
    commitSha: string;
    branch: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function createGithubWorkflowRun(client: Client, args: CreateGithubWorkflowRunArgs): Promise<CreateGithubWorkflowRunRow | null> {
    const result = await client.query({
        text: createGithubWorkflowRunQuery,
        values: [args.generatorRunId, args.orgName, args.repoName, args.workflowId, args.workflowRunId, args.workflowName, args.workflowUrl, args.status, args.conclusion, args.commitSha, args.branch],
        rowMode: "array"
    });
    if (result.rows.length !== 1) {
        return null;
    }
    const row = result.rows[0];
    return {
        id: row[0],
        generatorRunId: row[1],
        orgName: row[2],
        repoName: row[3],
        workflowId: row[4],
        workflowRunId: row[5],
        workflowName: row[6],
        workflowUrl: row[7],
        status: row[8],
        conclusion: row[9],
        commitSha: row[10],
        branch: row[11],
        createdAt: row[12],
        updatedAt: row[13]
    };
}

export const getGithubWorkflowRunQuery = `-- name: GetGithubWorkflowRun :one
SELECT id, generator_run_id, org_name, repo_name, workflow_id, workflow_run_id, workflow_name, workflow_url, status, conclusion, commit_sha, branch, created_at, updated_at FROM github_workflow_runs
WHERE id = $1`;

export interface GetGithubWorkflowRunArgs {
    id: number;
}

export interface GetGithubWorkflowRunRow {
    id: number;
    generatorRunId: number | null;
    orgName: string;
    repoName: string;
    workflowId: string;
    workflowRunId: string;
    workflowName: string;
    workflowUrl: string;
    status: string;
    conclusion: string | null;
    commitSha: string;
    branch: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function getGithubWorkflowRun(client: Client, args: GetGithubWorkflowRunArgs): Promise<GetGithubWorkflowRunRow | null> {
    const result = await client.query({
        text: getGithubWorkflowRunQuery,
        values: [args.id],
        rowMode: "array"
    });
    if (result.rows.length !== 1) {
        return null;
    }
    const row = result.rows[0];
    return {
        id: row[0],
        generatorRunId: row[1],
        orgName: row[2],
        repoName: row[3],
        workflowId: row[4],
        workflowRunId: row[5],
        workflowName: row[6],
        workflowUrl: row[7],
        status: row[8],
        conclusion: row[9],
        commitSha: row[10],
        branch: row[11],
        createdAt: row[12],
        updatedAt: row[13]
    };
}

export const getGithubWorkflowRunByWorkflowRunIdQuery = `-- name: GetGithubWorkflowRunByWorkflowRunId :one
SELECT id, generator_run_id, org_name, repo_name, workflow_id, workflow_run_id, workflow_name, workflow_url, status, conclusion, commit_sha, branch, created_at, updated_at FROM github_workflow_runs
WHERE workflow_run_id = $1`;

export interface GetGithubWorkflowRunByWorkflowRunIdArgs {
    workflowRunId: string;
}

export interface GetGithubWorkflowRunByWorkflowRunIdRow {
    id: number;
    generatorRunId: number | null;
    orgName: string;
    repoName: string;
    workflowId: string;
    workflowRunId: string;
    workflowName: string;
    workflowUrl: string;
    status: string;
    conclusion: string | null;
    commitSha: string;
    branch: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function getGithubWorkflowRunByWorkflowRunId(client: Client, args: GetGithubWorkflowRunByWorkflowRunIdArgs): Promise<GetGithubWorkflowRunByWorkflowRunIdRow | null> {
    const result = await client.query({
        text: getGithubWorkflowRunByWorkflowRunIdQuery,
        values: [args.workflowRunId],
        rowMode: "array"
    });
    if (result.rows.length !== 1) {
        return null;
    }
    const row = result.rows[0];
    return {
        id: row[0],
        generatorRunId: row[1],
        orgName: row[2],
        repoName: row[3],
        workflowId: row[4],
        workflowRunId: row[5],
        workflowName: row[6],
        workflowUrl: row[7],
        status: row[8],
        conclusion: row[9],
        commitSha: row[10],
        branch: row[11],
        createdAt: row[12],
        updatedAt: row[13]
    };
}

export const listGithubWorkflowRunsByGeneratorRunQuery = `-- name: ListGithubWorkflowRunsByGeneratorRun :many
SELECT id, generator_run_id, org_name, repo_name, workflow_id, workflow_run_id, workflow_name, workflow_url, status, conclusion, commit_sha, branch, created_at, updated_at FROM github_workflow_runs
WHERE generator_run_id = $1
ORDER BY created_at DESC`;

export interface ListGithubWorkflowRunsByGeneratorRunArgs {
    generatorRunId: number | null;
}

export interface ListGithubWorkflowRunsByGeneratorRunRow {
    id: number;
    generatorRunId: number | null;
    orgName: string;
    repoName: string;
    workflowId: string;
    workflowRunId: string;
    workflowName: string;
    workflowUrl: string;
    status: string;
    conclusion: string | null;
    commitSha: string;
    branch: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function listGithubWorkflowRunsByGeneratorRun(client: Client, args: ListGithubWorkflowRunsByGeneratorRunArgs): Promise<ListGithubWorkflowRunsByGeneratorRunRow[]> {
    const result = await client.query({
        text: listGithubWorkflowRunsByGeneratorRunQuery,
        values: [args.generatorRunId],
        rowMode: "array"
    });
    return result.rows.map(row => {
        return {
            id: row[0],
            generatorRunId: row[1],
            orgName: row[2],
            repoName: row[3],
            workflowId: row[4],
            workflowRunId: row[5],
            workflowName: row[6],
            workflowUrl: row[7],
            status: row[8],
            conclusion: row[9],
            commitSha: row[10],
            branch: row[11],
            createdAt: row[12],
            updatedAt: row[13]
        };
    });
}

export const listGithubWorkflowRunsByRepoQuery = `-- name: ListGithubWorkflowRunsByRepo :many
SELECT id, generator_run_id, org_name, repo_name, workflow_id, workflow_run_id, workflow_name, workflow_url, status, conclusion, commit_sha, branch, created_at, updated_at FROM github_workflow_runs
WHERE repo_name = $1
ORDER BY created_at DESC
LIMIT $2`;

export interface ListGithubWorkflowRunsByRepoArgs {
    repoName: string;
    limit: string;
}

export interface ListGithubWorkflowRunsByRepoRow {
    id: number;
    generatorRunId: number | null;
    orgName: string;
    repoName: string;
    workflowId: string;
    workflowRunId: string;
    workflowName: string;
    workflowUrl: string;
    status: string;
    conclusion: string | null;
    commitSha: string;
    branch: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function listGithubWorkflowRunsByRepo(client: Client, args: ListGithubWorkflowRunsByRepoArgs): Promise<ListGithubWorkflowRunsByRepoRow[]> {
    const result = await client.query({
        text: listGithubWorkflowRunsByRepoQuery,
        values: [args.repoName, args.limit],
        rowMode: "array"
    });
    return result.rows.map(row => {
        return {
            id: row[0],
            generatorRunId: row[1],
            orgName: row[2],
            repoName: row[3],
            workflowId: row[4],
            workflowRunId: row[5],
            workflowName: row[6],
            workflowUrl: row[7],
            status: row[8],
            conclusion: row[9],
            commitSha: row[10],
            branch: row[11],
            createdAt: row[12],
            updatedAt: row[13]
        };
    });
}

export const listGithubWorkflowRunsByStatusQuery = `-- name: ListGithubWorkflowRunsByStatus :many
SELECT id, generator_run_id, org_name, repo_name, workflow_id, workflow_run_id, workflow_name, workflow_url, status, conclusion, commit_sha, branch, created_at, updated_at FROM github_workflow_runs
WHERE status = $1
ORDER BY created_at DESC`;

export interface ListGithubWorkflowRunsByStatusArgs {
    status: string;
}

export interface ListGithubWorkflowRunsByStatusRow {
    id: number;
    generatorRunId: number | null;
    orgName: string;
    repoName: string;
    workflowId: string;
    workflowRunId: string;
    workflowName: string;
    workflowUrl: string;
    status: string;
    conclusion: string | null;
    commitSha: string;
    branch: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function listGithubWorkflowRunsByStatus(client: Client, args: ListGithubWorkflowRunsByStatusArgs): Promise<ListGithubWorkflowRunsByStatusRow[]> {
    const result = await client.query({
        text: listGithubWorkflowRunsByStatusQuery,
        values: [args.status],
        rowMode: "array"
    });
    return result.rows.map(row => {
        return {
            id: row[0],
            generatorRunId: row[1],
            orgName: row[2],
            repoName: row[3],
            workflowId: row[4],
            workflowRunId: row[5],
            workflowName: row[6],
            workflowUrl: row[7],
            status: row[8],
            conclusion: row[9],
            commitSha: row[10],
            branch: row[11],
            createdAt: row[12],
            updatedAt: row[13]
        };
    });
}

export const listRecentGithubWorkflowRunsQuery = `-- name: ListRecentGithubWorkflowRuns :many
SELECT id, generator_run_id, org_name, repo_name, workflow_id, workflow_run_id, workflow_name, workflow_url, status, conclusion, commit_sha, branch, created_at, updated_at FROM github_workflow_runs
ORDER BY created_at DESC
LIMIT $1`;

export interface ListRecentGithubWorkflowRunsArgs {
    limit: string;
}

export interface ListRecentGithubWorkflowRunsRow {
    id: number;
    generatorRunId: number | null;
    orgName: string;
    repoName: string;
    workflowId: string;
    workflowRunId: string;
    workflowName: string;
    workflowUrl: string;
    status: string;
    conclusion: string | null;
    commitSha: string;
    branch: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function listRecentGithubWorkflowRuns(client: Client, args: ListRecentGithubWorkflowRunsArgs): Promise<ListRecentGithubWorkflowRunsRow[]> {
    const result = await client.query({
        text: listRecentGithubWorkflowRunsQuery,
        values: [args.limit],
        rowMode: "array"
    });
    return result.rows.map(row => {
        return {
            id: row[0],
            generatorRunId: row[1],
            orgName: row[2],
            repoName: row[3],
            workflowId: row[4],
            workflowRunId: row[5],
            workflowName: row[6],
            workflowUrl: row[7],
            status: row[8],
            conclusion: row[9],
            commitSha: row[10],
            branch: row[11],
            createdAt: row[12],
            updatedAt: row[13]
        };
    });
}

export const updateGithubWorkflowRunStatusQuery = `-- name: UpdateGithubWorkflowRunStatus :one
UPDATE github_workflow_runs
SET
    status = $2,
    conclusion = $3
WHERE id = $1
RETURNING id, generator_run_id, org_name, repo_name, workflow_id, workflow_run_id, workflow_name, workflow_url, status, conclusion, commit_sha, branch, created_at, updated_at`;

export interface UpdateGithubWorkflowRunStatusArgs {
    id: number;
    status: string;
    conclusion: string | null;
}

export interface UpdateGithubWorkflowRunStatusRow {
    id: number;
    generatorRunId: number | null;
    orgName: string;
    repoName: string;
    workflowId: string;
    workflowRunId: string;
    workflowName: string;
    workflowUrl: string;
    status: string;
    conclusion: string | null;
    commitSha: string;
    branch: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function updateGithubWorkflowRunStatus(client: Client, args: UpdateGithubWorkflowRunStatusArgs): Promise<UpdateGithubWorkflowRunStatusRow | null> {
    const result = await client.query({
        text: updateGithubWorkflowRunStatusQuery,
        values: [args.id, args.status, args.conclusion],
        rowMode: "array"
    });
    if (result.rows.length !== 1) {
        return null;
    }
    const row = result.rows[0];
    return {
        id: row[0],
        generatorRunId: row[1],
        orgName: row[2],
        repoName: row[3],
        workflowId: row[4],
        workflowRunId: row[5],
        workflowName: row[6],
        workflowUrl: row[7],
        status: row[8],
        conclusion: row[9],
        commitSha: row[10],
        branch: row[11],
        createdAt: row[12],
        updatedAt: row[13]
    };
}

export const updateGithubWorkflowRunStatusByWorkflowRunIdQuery = `-- name: UpdateGithubWorkflowRunStatusByWorkflowRunId :one
UPDATE github_workflow_runs
SET
    status = $2,
    conclusion = $3
WHERE workflow_run_id = $1
RETURNING id, generator_run_id, org_name, repo_name, workflow_id, workflow_run_id, workflow_name, workflow_url, status, conclusion, commit_sha, branch, created_at, updated_at`;

export interface UpdateGithubWorkflowRunStatusByWorkflowRunIdArgs {
    workflowRunId: string;
    status: string;
    conclusion: string | null;
}

export interface UpdateGithubWorkflowRunStatusByWorkflowRunIdRow {
    id: number;
    generatorRunId: number | null;
    orgName: string;
    repoName: string;
    workflowId: string;
    workflowRunId: string;
    workflowName: string;
    workflowUrl: string;
    status: string;
    conclusion: string | null;
    commitSha: string;
    branch: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function updateGithubWorkflowRunStatusByWorkflowRunId(client: Client, args: UpdateGithubWorkflowRunStatusByWorkflowRunIdArgs): Promise<UpdateGithubWorkflowRunStatusByWorkflowRunIdRow | null> {
    const result = await client.query({
        text: updateGithubWorkflowRunStatusByWorkflowRunIdQuery,
        values: [args.workflowRunId, args.status, args.conclusion],
        rowMode: "array"
    });
    if (result.rows.length !== 1) {
        return null;
    }
    const row = result.rows[0];
    return {
        id: row[0],
        generatorRunId: row[1],
        orgName: row[2],
        repoName: row[3],
        workflowId: row[4],
        workflowRunId: row[5],
        workflowName: row[6],
        workflowUrl: row[7],
        status: row[8],
        conclusion: row[9],
        commitSha: row[10],
        branch: row[11],
        createdAt: row[12],
        updatedAt: row[13]
    };
}

export const deleteGithubWorkflowRunQuery = `-- name: DeleteGithubWorkflowRun :exec
DELETE FROM github_workflow_runs
WHERE id = $1`;

export interface DeleteGithubWorkflowRunArgs {
    id: number;
}

export async function deleteGithubWorkflowRun(client: Client, args: DeleteGithubWorkflowRunArgs): Promise<void> {
    await client.query({
        text: deleteGithubWorkflowRunQuery,
        values: [args.id],
        rowMode: "array"
    });
}

