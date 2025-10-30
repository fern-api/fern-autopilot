-- name: CreateCustomerOrg :one
INSERT INTO customer_orgs (
    org_name,
    github_org
) VALUES (
    $1, $2
) RETURNING *;

-- name: GetCustomerOrg :one
SELECT * FROM customer_orgs
WHERE id = $1;

-- name: GetCustomerOrgByName :one
SELECT * FROM customer_orgs
WHERE org_name = $1;

-- name: GetCustomerOrgByGithubOrg :one
SELECT * FROM customer_orgs
WHERE github_org = $1;

-- name: ListCustomerOrgs :many
SELECT * FROM customer_orgs
ORDER BY created_at DESC;

-- name: UpdateCustomerOrg :one
UPDATE customer_orgs
SET
    org_name = $2,
    github_org = $3
WHERE id = $1
RETURNING *;

-- name: DeleteCustomerOrg :exec
DELETE FROM customer_orgs
WHERE id = $1;
