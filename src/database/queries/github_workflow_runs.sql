-- name: CreateGithubWorkflowRun :one
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
) RETURNING *;

-- name: GetGithubWorkflowRun :one
SELECT * FROM github_workflow_runs
WHERE id = $1;

-- name: GetGithubWorkflowRunByWorkflowRunId :one
SELECT * FROM github_workflow_runs
WHERE workflow_run_id = $1;

-- name: ListGithubWorkflowRunsByGeneratorRun :many
SELECT * FROM github_workflow_runs
WHERE generator_run_id = $1
ORDER BY created_at DESC;

-- name: ListGithubWorkflowRunsByRepo :many
SELECT * FROM github_workflow_runs
WHERE repo_name = $1
ORDER BY created_at DESC
LIMIT $2;

-- name: ListGithubWorkflowRunsByStatus :many
SELECT * FROM github_workflow_runs
WHERE status = $1
ORDER BY created_at DESC;

-- name: ListRecentGithubWorkflowRuns :many
SELECT * FROM github_workflow_runs
ORDER BY created_at DESC
LIMIT $1;

-- name: UpdateGithubWorkflowRunStatus :one
UPDATE github_workflow_runs
SET
    status = $2,
    conclusion = $3
WHERE id = $1
RETURNING *;

-- name: UpdateGithubWorkflowRunStatusByWorkflowRunId :one
UPDATE github_workflow_runs
SET
    status = $2,
    conclusion = $3
WHERE workflow_run_id = $1
RETURNING *;

-- name: DeleteGithubWorkflowRun :exec
DELETE FROM github_workflow_runs
WHERE id = $1;
