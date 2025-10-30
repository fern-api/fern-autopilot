import { QueryArrayConfig, QueryArrayResult } from "pg";

interface Client {
  query: (config: QueryArrayConfig) => Promise<QueryArrayResult>;
}

export const createOrgSdkRepoQuery = `-- name: CreateOrgSdkRepo :one
INSERT INTO org_sdk_repos (
    customer_org_id,
    org_name,
    repo_name,
    repo_type
) VALUES (
    $1, $2, $3, $4
) RETURNING id, customer_org_id, org_name, repo_name, repo_type, created_at, updated_at`;

export interface CreateOrgSdkRepoArgs {
  customerOrgId: number;
  orgName: string;
  repoName: string;
  repoType: string;
}

export interface CreateOrgSdkRepoRow {
  id: number;
  customerOrgId: number;
  orgName: string;
  repoName: string;
  repoType: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function createOrgSdkRepo(
  client: Client,
  args: CreateOrgSdkRepoArgs
): Promise<CreateOrgSdkRepoRow | null> {
  const result = await client.query({
    text: createOrgSdkRepoQuery,
    values: [args.customerOrgId, args.orgName, args.repoName, args.repoType],
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
    repoType: row[4],
    createdAt: row[5],
    updatedAt: row[6]
  };
}

export const getOrgSdkRepoQuery = `-- name: GetOrgSdkRepo :one
SELECT id, customer_org_id, org_name, repo_name, repo_type, created_at, updated_at FROM org_sdk_repos
WHERE id = $1`;

export interface GetOrgSdkRepoArgs {
  id: number;
}

export interface GetOrgSdkRepoRow {
  id: number;
  customerOrgId: number;
  orgName: string;
  repoName: string;
  repoType: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function getOrgSdkRepo(client: Client, args: GetOrgSdkRepoArgs): Promise<GetOrgSdkRepoRow | null> {
  const result = await client.query({
    text: getOrgSdkRepoQuery,
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
    repoType: row[4],
    createdAt: row[5],
    updatedAt: row[6]
  };
}

export const getOrgSdkRepoByCustomerOrgAndNameQuery = `-- name: GetOrgSdkRepoByCustomerOrgAndName :one
SELECT id, customer_org_id, org_name, repo_name, repo_type, created_at, updated_at FROM org_sdk_repos
WHERE customer_org_id = $1 AND repo_name = $2`;

export interface GetOrgSdkRepoByCustomerOrgAndNameArgs {
  customerOrgId: number;
  repoName: string;
}

export interface GetOrgSdkRepoByCustomerOrgAndNameRow {
  id: number;
  customerOrgId: number;
  orgName: string;
  repoName: string;
  repoType: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function getOrgSdkRepoByCustomerOrgAndName(
  client: Client,
  args: GetOrgSdkRepoByCustomerOrgAndNameArgs
): Promise<GetOrgSdkRepoByCustomerOrgAndNameRow | null> {
  const result = await client.query({
    text: getOrgSdkRepoByCustomerOrgAndNameQuery,
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
    repoType: row[4],
    createdAt: row[5],
    updatedAt: row[6]
  };
}

export const listOrgSdkReposByCustomerOrgQuery = `-- name: ListOrgSdkReposByCustomerOrg :many
SELECT id, customer_org_id, org_name, repo_name, repo_type, created_at, updated_at FROM org_sdk_repos
WHERE customer_org_id = $1
ORDER BY created_at DESC`;

export interface ListOrgSdkReposByCustomerOrgArgs {
  customerOrgId: number;
}

export interface ListOrgSdkReposByCustomerOrgRow {
  id: number;
  customerOrgId: number;
  orgName: string;
  repoName: string;
  repoType: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function listOrgSdkReposByCustomerOrg(
  client: Client,
  args: ListOrgSdkReposByCustomerOrgArgs
): Promise<ListOrgSdkReposByCustomerOrgRow[]> {
  const result = await client.query({
    text: listOrgSdkReposByCustomerOrgQuery,
    values: [args.customerOrgId],
    rowMode: "array"
  });
  return result.rows.map((row) => {
    return {
      id: row[0],
      customerOrgId: row[1],
      orgName: row[2],
      repoName: row[3],
      repoType: row[4],
      createdAt: row[5],
      updatedAt: row[6]
    };
  });
}

export const listOrgSdkReposByRepoTypeQuery = `-- name: ListOrgSdkReposByRepoType :many
SELECT id, customer_org_id, org_name, repo_name, repo_type, created_at, updated_at FROM org_sdk_repos
WHERE repo_type = $1
ORDER BY created_at DESC`;

export interface ListOrgSdkReposByRepoTypeArgs {
  repoType: string;
}

export interface ListOrgSdkReposByRepoTypeRow {
  id: number;
  customerOrgId: number;
  orgName: string;
  repoName: string;
  repoType: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function listOrgSdkReposByRepoType(
  client: Client,
  args: ListOrgSdkReposByRepoTypeArgs
): Promise<ListOrgSdkReposByRepoTypeRow[]> {
  const result = await client.query({
    text: listOrgSdkReposByRepoTypeQuery,
    values: [args.repoType],
    rowMode: "array"
  });
  return result.rows.map((row) => {
    return {
      id: row[0],
      customerOrgId: row[1],
      orgName: row[2],
      repoName: row[3],
      repoType: row[4],
      createdAt: row[5],
      updatedAt: row[6]
    };
  });
}

export const listAllOrgSdkReposQuery = `-- name: ListAllOrgSdkRepos :many
SELECT id, customer_org_id, org_name, repo_name, repo_type, created_at, updated_at FROM org_sdk_repos
ORDER BY created_at DESC`;

export interface ListAllOrgSdkReposRow {
  id: number;
  customerOrgId: number;
  orgName: string;
  repoName: string;
  repoType: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function listAllOrgSdkRepos(client: Client): Promise<ListAllOrgSdkReposRow[]> {
  const result = await client.query({
    text: listAllOrgSdkReposQuery,
    values: [],
    rowMode: "array"
  });
  return result.rows.map((row) => {
    return {
      id: row[0],
      customerOrgId: row[1],
      orgName: row[2],
      repoName: row[3],
      repoType: row[4],
      createdAt: row[5],
      updatedAt: row[6]
    };
  });
}

export const updateOrgSdkRepoQuery = `-- name: UpdateOrgSdkRepo :one
UPDATE org_sdk_repos
SET
    org_name = $2,
    repo_name = $3,
    repo_type = $4
WHERE id = $1
RETURNING id, customer_org_id, org_name, repo_name, repo_type, created_at, updated_at`;

export interface UpdateOrgSdkRepoArgs {
  id: number;
  orgName: string;
  repoName: string;
  repoType: string;
}

export interface UpdateOrgSdkRepoRow {
  id: number;
  customerOrgId: number;
  orgName: string;
  repoName: string;
  repoType: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function updateOrgSdkRepo(
  client: Client,
  args: UpdateOrgSdkRepoArgs
): Promise<UpdateOrgSdkRepoRow | null> {
  const result = await client.query({
    text: updateOrgSdkRepoQuery,
    values: [args.id, args.orgName, args.repoName, args.repoType],
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
    repoType: row[4],
    createdAt: row[5],
    updatedAt: row[6]
  };
}

export const deleteOrgSdkRepoQuery = `-- name: DeleteOrgSdkRepo :exec
DELETE FROM org_sdk_repos
WHERE id = $1`;

export interface DeleteOrgSdkRepoArgs {
  id: number;
}

export async function deleteOrgSdkRepo(client: Client, args: DeleteOrgSdkRepoArgs): Promise<void> {
  await client.query({
    text: deleteOrgSdkRepoQuery,
    values: [args.id],
    rowMode: "array"
  });
}
