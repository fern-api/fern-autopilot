import { QueryArrayConfig, QueryArrayResult } from "pg";

interface Client {
  query: (config: QueryArrayConfig) => Promise<QueryArrayResult>;
}

export const createCustomerOrgQuery = `-- name: CreateCustomerOrg :one
INSERT INTO customer_orgs (
    org_name,
    github_org
) VALUES (
    $1, $2
) RETURNING id, org_name, github_org, created_at, updated_at`;

export interface CreateCustomerOrgArgs {
  orgName: string;
  githubOrg: string;
}

export interface CreateCustomerOrgRow {
  id: number;
  orgName: string;
  githubOrg: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function createCustomerOrg(
  client: Client,
  args: CreateCustomerOrgArgs
): Promise<CreateCustomerOrgRow | null> {
  const result = await client.query({
    text: createCustomerOrgQuery,
    values: [args.orgName, args.githubOrg],
    rowMode: "array"
  });
  if (result.rows.length !== 1) {
    return null;
  }
  const row = result.rows[0];
  return {
    id: row[0],
    orgName: row[1],
    githubOrg: row[2],
    createdAt: row[3],
    updatedAt: row[4]
  };
}

export const getCustomerOrgQuery = `-- name: GetCustomerOrg :one
SELECT id, org_name, github_org, created_at, updated_at FROM customer_orgs
WHERE id = $1`;

export interface GetCustomerOrgArgs {
  id: number;
}

export interface GetCustomerOrgRow {
  id: number;
  orgName: string;
  githubOrg: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function getCustomerOrg(client: Client, args: GetCustomerOrgArgs): Promise<GetCustomerOrgRow | null> {
  const result = await client.query({
    text: getCustomerOrgQuery,
    values: [args.id],
    rowMode: "array"
  });
  if (result.rows.length !== 1) {
    return null;
  }
  const row = result.rows[0];
  return {
    id: row[0],
    orgName: row[1],
    githubOrg: row[2],
    createdAt: row[3],
    updatedAt: row[4]
  };
}

export const getCustomerOrgByNameQuery = `-- name: GetCustomerOrgByName :one
SELECT id, org_name, github_org, created_at, updated_at FROM customer_orgs
WHERE org_name = $1`;

export interface GetCustomerOrgByNameArgs {
  orgName: string;
}

export interface GetCustomerOrgByNameRow {
  id: number;
  orgName: string;
  githubOrg: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function getCustomerOrgByName(
  client: Client,
  args: GetCustomerOrgByNameArgs
): Promise<GetCustomerOrgByNameRow | null> {
  const result = await client.query({
    text: getCustomerOrgByNameQuery,
    values: [args.orgName],
    rowMode: "array"
  });
  if (result.rows.length !== 1) {
    return null;
  }
  const row = result.rows[0];
  return {
    id: row[0],
    orgName: row[1],
    githubOrg: row[2],
    createdAt: row[3],
    updatedAt: row[4]
  };
}

export const getCustomerOrgByGithubOrgQuery = `-- name: GetCustomerOrgByGithubOrg :one
SELECT id, org_name, github_org, created_at, updated_at FROM customer_orgs
WHERE github_org = $1`;

export interface GetCustomerOrgByGithubOrgArgs {
  githubOrg: string;
}

export interface GetCustomerOrgByGithubOrgRow {
  id: number;
  orgName: string;
  githubOrg: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function getCustomerOrgByGithubOrg(
  client: Client,
  args: GetCustomerOrgByGithubOrgArgs
): Promise<GetCustomerOrgByGithubOrgRow | null> {
  const result = await client.query({
    text: getCustomerOrgByGithubOrgQuery,
    values: [args.githubOrg],
    rowMode: "array"
  });
  if (result.rows.length !== 1) {
    return null;
  }
  const row = result.rows[0];
  return {
    id: row[0],
    orgName: row[1],
    githubOrg: row[2],
    createdAt: row[3],
    updatedAt: row[4]
  };
}

export const listCustomerOrgsQuery = `-- name: ListCustomerOrgs :many
SELECT id, org_name, github_org, created_at, updated_at FROM customer_orgs
ORDER BY created_at DESC`;

export interface ListCustomerOrgsRow {
  id: number;
  orgName: string;
  githubOrg: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function listCustomerOrgs(client: Client): Promise<ListCustomerOrgsRow[]> {
  const result = await client.query({
    text: listCustomerOrgsQuery,
    values: [],
    rowMode: "array"
  });
  return result.rows.map((row) => {
    return {
      id: row[0],
      orgName: row[1],
      githubOrg: row[2],
      createdAt: row[3],
      updatedAt: row[4]
    };
  });
}

export const updateCustomerOrgQuery = `-- name: UpdateCustomerOrg :one
UPDATE customer_orgs
SET
    org_name = $2,
    github_org = $3
WHERE id = $1
RETURNING id, org_name, github_org, created_at, updated_at`;

export interface UpdateCustomerOrgArgs {
  id: number;
  orgName: string;
  githubOrg: string;
}

export interface UpdateCustomerOrgRow {
  id: number;
  orgName: string;
  githubOrg: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function updateCustomerOrg(
  client: Client,
  args: UpdateCustomerOrgArgs
): Promise<UpdateCustomerOrgRow | null> {
  const result = await client.query({
    text: updateCustomerOrgQuery,
    values: [args.id, args.orgName, args.githubOrg],
    rowMode: "array"
  });
  if (result.rows.length !== 1) {
    return null;
  }
  const row = result.rows[0];
  return {
    id: row[0],
    orgName: row[1],
    githubOrg: row[2],
    createdAt: row[3],
    updatedAt: row[4]
  };
}

export const deleteCustomerOrgQuery = `-- name: DeleteCustomerOrg :exec
DELETE FROM customer_orgs
WHERE id = $1`;

export interface DeleteCustomerOrgArgs {
  id: number;
}

export async function deleteCustomerOrg(client: Client, args: DeleteCustomerOrgArgs): Promise<void> {
  await client.query({
    text: deleteCustomerOrgQuery,
    values: [args.id],
    rowMode: "array"
  });
}
