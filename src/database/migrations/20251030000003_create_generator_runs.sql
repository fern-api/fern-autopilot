-- +goose Up
-- Create generator_runs table
-- This table stores Fern generator execution runs

-- Create enum type for generator run status
CREATE TYPE generator_run_status AS ENUM (
    'queued',
    'running',
    'succeeded',
    'failed',
    'cancelled'
);

CREATE TABLE IF NOT EXISTS generator_runs (
    id SERIAL PRIMARY KEY,
    org_config_repo_id INTEGER NOT NULL REFERENCES org_config_repos(id) ON DELETE CASCADE,
    generator_name TEXT NOT NULL,
    generator_version TEXT,
    status generator_run_status NOT NULL DEFAULT 'queued',
    trigger_type TEXT NOT NULL,
    commit_sha TEXT NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes for common queries
CREATE INDEX idx_generator_runs_org_config_repo_id ON generator_runs(org_config_repo_id);
CREATE INDEX idx_generator_runs_status ON generator_runs(status);
CREATE INDEX idx_generator_runs_created_at ON generator_runs(created_at DESC);
CREATE INDEX idx_generator_runs_commit_sha ON generator_runs(commit_sha);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_generator_runs_updated_at
    BEFORE UPDATE ON generator_runs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- +goose Down
-- Drop trigger, table, and enum type
DROP TRIGGER IF EXISTS update_generator_runs_updated_at ON generator_runs;
DROP TABLE IF EXISTS generator_runs;
DROP TYPE IF EXISTS generator_run_status;
