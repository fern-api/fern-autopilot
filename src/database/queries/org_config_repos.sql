-- name: CreateOrgConfigRepo :one
INSERT INTO org_config_repos (
    customer_org_id,
    org_name,
    repo_name,
    github_repo_url
) VALUES (
    $1, $2, $3, $4
) RETURNING *;

-- name: GetOrgConfigRepo :one
SELECT * FROM org_config_repos
WHERE id = $1;

-- name: GetOrgConfigRepoByCustomerOrgAndName :one
SELECT * FROM org_config_repos
WHERE customer_org_id = $1 AND repo_name = $2;

-- name: ListOrgConfigReposByCustomerOrg :many
SELECT * FROM org_config_repos
WHERE customer_org_id = $1
ORDER BY created_at DESC;

-- name: ListAllOrgConfigRepos :many
SELECT * FROM org_config_repos
ORDER BY created_at DESC;

-- name: UpdateOrgConfigRepo :one
UPDATE org_config_repos
SET
    org_name = $2,
    repo_name = $3,
    github_repo_url = $4
WHERE id = $1
RETURNING *;

-- name: DeleteOrgConfigRepo :exec
DELETE FROM org_config_repos
WHERE id = $1;
