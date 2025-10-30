import { QueryArrayConfig, QueryArrayResult } from "pg";

interface Client {
  query: (config: QueryArrayConfig) => Promise<QueryArrayResult>;
}

export const createOrgConfigRepoQuery = `-- name: CreateOrgConfigRepo :one
INSERT INTO org_config_repos (
    customer_org_id,
    org_name,
    repo_name,
    github_repo_url
) VALUES (
    $1, $2, $3, $4
) RETURNING id, customer_org_id, org_name, repo_name, github_repo_url, created_at, updated_at`;

export interface CreateOrgConfigRepoArgs {
  customerOrgId: number;
  orgName: string;
  repoName: string;
  githubRepoUrl: string;
}

export interface CreateOrgConfigRepoRow {
  id: number;
  customerOrgId: number;
  orgName: string;
  repoName: string;
  githubRepoUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function createOrgConfigRepo(
  client: Client,
  args: CreateOrgConfigRepoArgs
): Promise<CreateOrgConfigRepoRow | null> {
  const result = await client.query({
    text: createOrgConfigRepoQuery,
    values: [args.customerOrgId, args.orgName, args.repoName, args.githubRepoUrl],
    rowMode: "array"
  });
  if (result.rows.length !== 1) {
    return null;
  }
  const row = result.rows[0];
  return {
    id: row[0],
    customerOrgId: row[1],
    orgName: row[2],
    repoName: row[3],
    githubRepoUrl: row[4],
    createdAt: row[5],
    updatedAt: row[6]
  };
}

export const getOrgConfigRepoQuery = `-- name: GetOrgConfigRepo :one
SELECT id, customer_org_id, org_name, repo_name, github_repo_url, created_at, updated_at FROM org_config_repos
WHERE id = $1`;

export interface GetOrgConfigRepoArgs {
  id: number;
}

export interface GetOrgConfigRepoRow {
  id: number;
  customerOrgId: number;
  orgName: string;
  repoName: string;
  githubRepoUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function getOrgConfigRepo(
  client: Client,
  args: GetOrgConfigRepoArgs
): Promise<GetOrgConfigRepoRow | null> {
  const result = await client.query({
    text: getOrgConfigRepoQuery,
    values: [args.id],
    rowMode: "array"
  });
  if (result.rows.length !== 1) {
    return null;
  }
  const row = result.rows[0];
  return {
    id: row[0],
    customerOrgId: row[1],
    orgName: row[2],
    repoName: row[3],
    githubRepoUrl: row[4],
    createdAt: row[5],
    updatedAt: row[6]
  };
}

export const getOrgConfigRepoByCustomerOrgAndNameQuery = `-- name: GetOrgConfigRepoByCustomerOrgAndName :one
SELECT id, customer_org_id, org_name, repo_name, github_repo_url, created_at, updated_at FROM org_config_repos
WHERE customer_org_id = $1 AND repo_name = $2`;

export interface GetOrgConfigRepoByCustomerOrgAndNameArgs {
  customerOrgId: number;
  repoName: string;
}

export interface GetOrgConfigRepoByCustomerOrgAndNameRow {
  id: number;
  customerOrgId: number;
  orgName: string;
  repoName: string;
  githubRepoUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function getOrgConfigRepoByCustomerOrgAndName(
  client: Client,
  args: GetOrgConfigRepoByCustomerOrgAndNameArgs
): Promise<GetOrgConfigRepoByCustomerOrgAndNameRow | null> {
  const result = await client.query({
    text: getOrgConfigRepoByCustomerOrgAndNameQuery,
    values: [args.customerOrgId, args.repoName],
    rowMode: "array"
  });
  if (result.rows.length !== 1) {
    return null;
  }
  const row = result.rows[0];
  return {
    id: row[0],
    customerOrgId: row[1],
    orgName: row[2],
    repoName: row[3],
    githubRepoUrl: row[4],
    createdAt: row[5],
    updatedAt: row[6]
  };
}

export const listOrgConfigReposByCustomerOrgQuery = `-- name: ListOrgConfigReposByCustomerOrg :many
SELECT id, customer_org_id, org_name, repo_name, github_repo_url, created_at, updated_at FROM org_config_repos
WHERE customer_org_id = $1
ORDER BY created_at DESC`;

export interface ListOrgConfigReposByCustomerOrgArgs {
  customerOrgId: number;
}

export interface ListOrgConfigReposByCustomerOrgRow {
  id: number;
  customerOrgId: number;
  orgName: string;
  repoName: string;
  githubRepoUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function listOrgConfigReposByCustomerOrg(
  client: Client,
  args: ListOrgConfigReposByCustomerOrgArgs
): Promise<ListOrgConfigReposByCustomerOrgRow[]> {
  const result = await client.query({
    text: listOrgConfigReposByCustomerOrgQuery,
    values: [args.customerOrgId],
    rowMode: "array"
  });
  return result.rows.map((row) => {
    return {
      id: row[0],
      customerOrgId: row[1],
      orgName: row[2],
      repoName: row[3],
      githubRepoUrl: row[4],
      createdAt: row[5],
      updatedAt: row[6]
    };
  });
}

export const listAllOrgConfigReposQuery = `-- name: ListAllOrgConfigRepos :many
SELECT id, customer_org_id, org_name, repo_name, github_repo_url, created_at, updated_at FROM org_config_repos
ORDER BY created_at DESC`;

export interface ListAllOrgConfigReposRow {
  id: number;
  customerOrgId: number;
  orgName: string;
  repoName: string;
  githubRepoUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function listAllOrgConfigRepos(client: Client): Promise<ListAllOrgConfigReposRow[]> {
  const result = await client.query({
    text: listAllOrgConfigReposQuery,
    values: [],
    rowMode: "array"
  });
  return result.rows.map((row) => {
    return {
      id: row[0],
      customerOrgId: row[1],
      orgName: row[2],
      repoName: row[3],
      githubRepoUrl: row[4],
      createdAt: row[5],
      updatedAt: row[6]
    };
  });
}

export const updateOrgConfigRepoQuery = `-- name: UpdateOrgConfigRepo :one
UPDATE org_config_repos
SET
    org_name = $2,
    repo_name = $3,
    github_repo_url = $4
WHERE id = $1
RETURNING id, customer_org_id, org_name, repo_name, github_repo_url, created_at, updated_at`;

export interface UpdateOrgConfigRepoArgs {
  id: number;
  orgName: string;
  repoName: string;
  githubRepoUrl: string;
}

export interface UpdateOrgConfigRepoRow {
  id: number;
  customerOrgId: number;
  orgName: string;
  repoName: string;
  githubRepoUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function updateOrgConfigRepo(
  client: Client,
  args: UpdateOrgConfigRepoArgs
): Promise<UpdateOrgConfigRepoRow | null> {
  const result = await client.query({
    text: updateOrgConfigRepoQuery,
    values: [args.id, args.orgName, args.repoName, args.githubRepoUrl],
    rowMode: "array"
  });
  if (result.rows.length !== 1) {
    return null;
  }
  const row = result.rows[0];
  return {
    id: row[0],
    customerOrgId: row[1],
    orgName: row[2],
    repoName: row[3],
    githubRepoUrl: row[4],
    createdAt: row[5],
    updatedAt: row[6]
  };
}

export const deleteOrgConfigRepoQuery = `-- name: DeleteOrgConfigRepo :exec
DELETE FROM org_config_repos
WHERE id = $1`;

export interface DeleteOrgConfigRepoArgs {
  id: number;
}

export async function deleteOrgConfigRepo(client: Client, args: DeleteOrgConfigRepoArgs): Promise<void> {
  await client.query({
    text: deleteOrgConfigRepoQuery,
    values: [args.id],
    rowMode: "array"
  });
}
