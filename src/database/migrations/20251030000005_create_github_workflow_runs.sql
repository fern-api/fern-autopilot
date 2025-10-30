-- +goose Up
-- Create github_workflow_runs table
-- This table stores GitHub Actions workflow run metadata for tracking and monitoring

-- Create enum type for workflow run status
CREATE TYPE workflow_run_status AS ENUM (
    'queued',
    'in_progress',
    'completed',
    'waiting',
    'requested',
    'pending'
);

-- Create enum type for workflow run conclusion
CREATE TYPE workflow_run_conclusion AS ENUM (
    'success',
    'failure',
    'cancelled',
    'skipped',
    'timed_out',
    'action_required',
    'neutral',
    'stale'
);

CREATE TABLE IF NOT EXISTS github_workflow_runs (
    id SERIAL PRIMARY KEY,
    generator_run_id INTEGER REFERENCES generator_runs(id) ON DELETE SET NULL,
    org_name TEXT NOT NULL,
    repo_name TEXT NOT NULL,
    workflow_id BIGINT NOT NULL,
    workflow_run_id BIGINT NOT NULL UNIQUE,
    workflow_name TEXT NOT NULL,
    workflow_url TEXT NOT NULL,
    status workflow_run_status NOT NULL DEFAULT 'queued',
    conclusion workflow_run_conclusion,
    commit_sha TEXT NOT NULL,
    branch TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes for common queries
CREATE INDEX idx_github_workflow_runs_generator_run_id ON github_workflow_runs(generator_run_id);
CREATE INDEX idx_github_workflow_runs_workflow_id ON github_workflow_runs(workflow_id);
CREATE INDEX idx_github_workflow_runs_status ON github_workflow_runs(status);
CREATE INDEX idx_github_workflow_runs_conclusion ON github_workflow_runs(conclusion);
CREATE INDEX idx_github_workflow_runs_repo_name ON github_workflow_runs(repo_name);
CREATE INDEX idx_github_workflow_runs_commit_sha ON github_workflow_runs(commit_sha);
CREATE INDEX idx_github_workflow_runs_created_at ON github_workflow_runs(created_at DESC);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_github_workflow_runs_updated_at
    BEFORE UPDATE ON github_workflow_runs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- +goose Down
-- Drop trigger, table, and enum types
DROP TRIGGER IF EXISTS update_github_workflow_runs_updated_at ON github_workflow_runs;
DROP TABLE IF EXISTS github_workflow_runs;
DROP TYPE IF EXISTS workflow_run_conclusion;
DROP TYPE IF EXISTS workflow_run_status;
