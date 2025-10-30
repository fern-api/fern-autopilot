-- name: CreateGeneratorRun :one
INSERT INTO generator_runs (
    org_config_repo_id,
    generator_name,
    generator_version,
    status,
    trigger_type,
    commit_sha
) VALUES (
    $1, $2, $3, $4, $5, $6
) RETURNING *;

-- name: GetGeneratorRun :one
SELECT * FROM generator_runs
WHERE id = $1;

-- name: ListGeneratorRunsByConfigRepo :many
SELECT * FROM generator_runs
WHERE org_config_repo_id = $1
ORDER BY created_at DESC;

-- name: ListGeneratorRunsByStatus :many
SELECT * FROM generator_runs
WHERE status = $1
ORDER BY created_at DESC;

-- name: ListRecentGeneratorRuns :many
SELECT * FROM generator_runs
ORDER BY created_at DESC
LIMIT $1;

-- name: UpdateGeneratorRunStatus :one
UPDATE generator_runs
SET status = $2
WHERE id = $1
RETURNING *;

-- name: StartGeneratorRun :one
UPDATE generator_runs
SET
    status = 'running',
    started_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING *;

-- name: CompleteGeneratorRun :one
UPDATE generator_runs
SET
    status = $2,
    completed_at = CURRENT_TIMESTAMP,
    error_message = $3
WHERE id = $1
RETURNING *;

-- name: DeleteGeneratorRun :exec
DELETE FROM generator_runs
WHERE id = $1;
