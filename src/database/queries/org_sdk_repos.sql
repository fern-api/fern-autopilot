-- name: CreateOrgSdkRepo :one
INSERT INTO org_sdk_repos (
    customer_org_id,
    org_name,
    repo_name,
    repo_type
) VALUES (
    $1, $2, $3, $4
) RETURNING *;

-- name: GetOrgSdkRepo :one
SELECT * FROM org_sdk_repos
WHERE id = $1;

-- name: GetOrgSdkRepoByCustomerOrgAndName :one
SELECT * FROM org_sdk_repos
WHERE customer_org_id = $1 AND repo_name = $2;

-- name: ListOrgSdkReposByCustomerOrg :many
SELECT * FROM org_sdk_repos
WHERE customer_org_id = $1
ORDER BY created_at DESC;

-- name: ListOrgSdkReposByRepoType :many
SELECT * FROM org_sdk_repos
WHERE repo_type = $1
ORDER BY created_at DESC;

-- name: ListAllOrgSdkRepos :many
SELECT * FROM org_sdk_repos
ORDER BY created_at DESC;

-- name: UpdateOrgSdkRepo :one
UPDATE org_sdk_repos
SET
    org_name = $2,
    repo_name = $3,
    repo_type = $4
WHERE id = $1
RETURNING *;

-- name: DeleteOrgSdkRepo :exec
DELETE FROM org_sdk_repos
WHERE id = $1;
