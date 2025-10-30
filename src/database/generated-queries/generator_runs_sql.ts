import { QueryArrayConfig, QueryArrayResult } from "pg";

interface Client {
  query: (config: QueryArrayConfig) => Promise<QueryArrayResult>;
}

export const createGeneratorRunQuery = `-- name: CreateGeneratorRun :one
INSERT INTO generator_runs (
    org_config_repo_id,
    generator_name,
    generator_version,
    status,
    trigger_type,
    commit_sha
) VALUES (
    $1, $2, $3, $4, $5, $6
) RETURNING id, org_config_repo_id, generator_name, generator_version, status, trigger_type, commit_sha, started_at, completed_at, error_message, created_at, updated_at`;

export interface CreateGeneratorRunArgs {
  orgConfigRepoId: number;
  generatorName: string;
  generatorVersion: string | null;
  status: string;
  triggerType: string;
  commitSha: string;
}

export interface CreateGeneratorRunRow {
  id: number;
  orgConfigRepoId: number;
  generatorName: string;
  generatorVersion: string | null;
  status: string;
  triggerType: string;
  commitSha: string;
  startedAt: Date | null;
  completedAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function createGeneratorRun(
  client: Client,
  args: CreateGeneratorRunArgs
): Promise<CreateGeneratorRunRow | null> {
  const result = await client.query({
    text: createGeneratorRunQuery,
    values: [
      args.orgConfigRepoId,
      args.generatorName,
      args.generatorVersion,
      args.status,
      args.triggerType,
      args.commitSha
    ],
    rowMode: "array"
  });
  if (result.rows.length !== 1) {
    return null;
  }
  const row = result.rows[0];
  return {
    id: row[0],
    orgConfigRepoId: row[1],
    generatorName: row[2],
    generatorVersion: row[3],
    status: row[4],
    triggerType: row[5],
    commitSha: row[6],
    startedAt: row[7],
    completedAt: row[8],
    errorMessage: row[9],
    createdAt: row[10],
    updatedAt: row[11]
  };
}

export const getGeneratorRunQuery = `-- name: GetGeneratorRun :one
SELECT id, org_config_repo_id, generator_name, generator_version, status, trigger_type, commit_sha, started_at, completed_at, error_message, created_at, updated_at FROM generator_runs
WHERE id = $1`;

export interface GetGeneratorRunArgs {
  id: number;
}

export interface GetGeneratorRunRow {
  id: number;
  orgConfigRepoId: number;
  generatorName: string;
  generatorVersion: string | null;
  status: string;
  triggerType: string;
  commitSha: string;
  startedAt: Date | null;
  completedAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function getGeneratorRun(client: Client, args: GetGeneratorRunArgs): Promise<GetGeneratorRunRow | null> {
  const result = await client.query({
    text: getGeneratorRunQuery,
    values: [args.id],
    rowMode: "array"
  });
  if (result.rows.length !== 1) {
    return null;
  }
  const row = result.rows[0];
  return {
    id: row[0],
    orgConfigRepoId: row[1],
    generatorName: row[2],
    generatorVersion: row[3],
    status: row[4],
    triggerType: row[5],
    commitSha: row[6],
    startedAt: row[7],
    completedAt: row[8],
    errorMessage: row[9],
    createdAt: row[10],
    updatedAt: row[11]
  };
}

export const listGeneratorRunsByConfigRepoQuery = `-- name: ListGeneratorRunsByConfigRepo :many
SELECT id, org_config_repo_id, generator_name, generator_version, status, trigger_type, commit_sha, started_at, completed_at, error_message, created_at, updated_at FROM generator_runs
WHERE org_config_repo_id = $1
ORDER BY created_at DESC`;

export interface ListGeneratorRunsByConfigRepoArgs {
  orgConfigRepoId: number;
}

export interface ListGeneratorRunsByConfigRepoRow {
  id: number;
  orgConfigRepoId: number;
  generatorName: string;
  generatorVersion: string | null;
  status: string;
  triggerType: string;
  commitSha: string;
  startedAt: Date | null;
  completedAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function listGeneratorRunsByConfigRepo(
  client: Client,
  args: ListGeneratorRunsByConfigRepoArgs
): Promise<ListGeneratorRunsByConfigRepoRow[]> {
  const result = await client.query({
    text: listGeneratorRunsByConfigRepoQuery,
    values: [args.orgConfigRepoId],
    rowMode: "array"
  });
  return result.rows.map((row) => {
    return {
      id: row[0],
      orgConfigRepoId: row[1],
      generatorName: row[2],
      generatorVersion: row[3],
      status: row[4],
      triggerType: row[5],
      commitSha: row[6],
      startedAt: row[7],
      completedAt: row[8],
      errorMessage: row[9],
      createdAt: row[10],
      updatedAt: row[11]
    };
  });
}

export const listGeneratorRunsByStatusQuery = `-- name: ListGeneratorRunsByStatus :many
SELECT id, org_config_repo_id, generator_name, generator_version, status, trigger_type, commit_sha, started_at, completed_at, error_message, created_at, updated_at FROM generator_runs
WHERE status = $1
ORDER BY created_at DESC`;

export interface ListGeneratorRunsByStatusArgs {
  status: string;
}

export interface ListGeneratorRunsByStatusRow {
  id: number;
  orgConfigRepoId: number;
  generatorName: string;
  generatorVersion: string | null;
  status: string;
  triggerType: string;
  commitSha: string;
  startedAt: Date | null;
  completedAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function listGeneratorRunsByStatus(
  client: Client,
  args: ListGeneratorRunsByStatusArgs
): Promise<ListGeneratorRunsByStatusRow[]> {
  const result = await client.query({
    text: listGeneratorRunsByStatusQuery,
    values: [args.status],
    rowMode: "array"
  });
  return result.rows.map((row) => {
    return {
      id: row[0],
      orgConfigRepoId: row[1],
      generatorName: row[2],
      generatorVersion: row[3],
      status: row[4],
      triggerType: row[5],
      commitSha: row[6],
      startedAt: row[7],
      completedAt: row[8],
      errorMessage: row[9],
      createdAt: row[10],
      updatedAt: row[11]
    };
  });
}

export const listRecentGeneratorRunsQuery = `-- name: ListRecentGeneratorRuns :many
SELECT id, org_config_repo_id, generator_name, generator_version, status, trigger_type, commit_sha, started_at, completed_at, error_message, created_at, updated_at FROM generator_runs
ORDER BY created_at DESC
LIMIT $1`;

export interface ListRecentGeneratorRunsArgs {
  limit: string;
}

export interface ListRecentGeneratorRunsRow {
  id: number;
  orgConfigRepoId: number;
  generatorName: string;
  generatorVersion: string | null;
  status: string;
  triggerType: string;
  commitSha: string;
  startedAt: Date | null;
  completedAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function listRecentGeneratorRuns(
  client: Client,
  args: ListRecentGeneratorRunsArgs
): Promise<ListRecentGeneratorRunsRow[]> {
  const result = await client.query({
    text: listRecentGeneratorRunsQuery,
    values: [args.limit],
    rowMode: "array"
  });
  return result.rows.map((row) => {
    return {
      id: row[0],
      orgConfigRepoId: row[1],
      generatorName: row[2],
      generatorVersion: row[3],
      status: row[4],
      triggerType: row[5],
      commitSha: row[6],
      startedAt: row[7],
      completedAt: row[8],
      errorMessage: row[9],
      createdAt: row[10],
      updatedAt: row[11]
    };
  });
}

export const updateGeneratorRunStatusQuery = `-- name: UpdateGeneratorRunStatus :one
UPDATE generator_runs
SET status = $2
WHERE id = $1
RETURNING id, org_config_repo_id, generator_name, generator_version, status, trigger_type, commit_sha, started_at, completed_at, error_message, created_at, updated_at`;

export interface UpdateGeneratorRunStatusArgs {
  id: number;
  status: string;
}

export interface UpdateGeneratorRunStatusRow {
  id: number;
  orgConfigRepoId: number;
  generatorName: string;
  generatorVersion: string | null;
  status: string;
  triggerType: string;
  commitSha: string;
  startedAt: Date | null;
  completedAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function updateGeneratorRunStatus(
  client: Client,
  args: UpdateGeneratorRunStatusArgs
): Promise<UpdateGeneratorRunStatusRow | null> {
  const result = await client.query({
    text: updateGeneratorRunStatusQuery,
    values: [args.id, args.status],
    rowMode: "array"
  });
  if (result.rows.length !== 1) {
    return null;
  }
  const row = result.rows[0];
  return {
    id: row[0],
    orgConfigRepoId: row[1],
    generatorName: row[2],
    generatorVersion: row[3],
    status: row[4],
    triggerType: row[5],
    commitSha: row[6],
    startedAt: row[7],
    completedAt: row[8],
    errorMessage: row[9],
    createdAt: row[10],
    updatedAt: row[11]
  };
}

export const startGeneratorRunQuery = `-- name: StartGeneratorRun :one
UPDATE generator_runs
SET
    status = 'running',
    started_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING id, org_config_repo_id, generator_name, generator_version, status, trigger_type, commit_sha, started_at, completed_at, error_message, created_at, updated_at`;

export interface StartGeneratorRunArgs {
  id: number;
}

export interface StartGeneratorRunRow {
  id: number;
  orgConfigRepoId: number;
  generatorName: string;
  generatorVersion: string | null;
  status: string;
  triggerType: string;
  commitSha: string;
  startedAt: Date | null;
  completedAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function startGeneratorRun(
  client: Client,
  args: StartGeneratorRunArgs
): Promise<StartGeneratorRunRow | null> {
  const result = await client.query({
    text: startGeneratorRunQuery,
    values: [args.id],
    rowMode: "array"
  });
  if (result.rows.length !== 1) {
    return null;
  }
  const row = result.rows[0];
  return {
    id: row[0],
    orgConfigRepoId: row[1],
    generatorName: row[2],
    generatorVersion: row[3],
    status: row[4],
    triggerType: row[5],
    commitSha: row[6],
    startedAt: row[7],
    completedAt: row[8],
    errorMessage: row[9],
    createdAt: row[10],
    updatedAt: row[11]
  };
}

export const completeGeneratorRunQuery = `-- name: CompleteGeneratorRun :one
UPDATE generator_runs
SET
    status = $2,
    completed_at = CURRENT_TIMESTAMP,
    error_message = $3
WHERE id = $1
RETURNING id, org_config_repo_id, generator_name, generator_version, status, trigger_type, commit_sha, started_at, completed_at, error_message, created_at, updated_at`;

export interface CompleteGeneratorRunArgs {
  id: number;
  status: string;
  errorMessage: string | null;
}

export interface CompleteGeneratorRunRow {
  id: number;
  orgConfigRepoId: number;
  generatorName: string;
  generatorVersion: string | null;
  status: string;
  triggerType: string;
  commitSha: string;
  startedAt: Date | null;
  completedAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function completeGeneratorRun(
  client: Client,
  args: CompleteGeneratorRunArgs
): Promise<CompleteGeneratorRunRow | null> {
  const result = await client.query({
    text: completeGeneratorRunQuery,
    values: [args.id, args.status, args.errorMessage],
    rowMode: "array"
  });
  if (result.rows.length !== 1) {
    return null;
  }
  const row = result.rows[0];
  return {
    id: row[0],
    orgConfigRepoId: row[1],
    generatorName: row[2],
    generatorVersion: row[3],
    status: row[4],
    triggerType: row[5],
    commitSha: row[6],
    startedAt: row[7],
    completedAt: row[8],
    errorMessage: row[9],
    createdAt: row[10],
    updatedAt: row[11]
  };
}

export const deleteGeneratorRunQuery = `-- name: DeleteGeneratorRun :exec
DELETE FROM generator_runs
WHERE id = $1`;

export interface DeleteGeneratorRunArgs {
  id: number;
}

export async function deleteGeneratorRun(client: Client, args: DeleteGeneratorRunArgs): Promise<void> {
  await client.query({
    text: deleteGeneratorRunQuery,
    values: [args.id],
    rowMode: "array"
  });
}
