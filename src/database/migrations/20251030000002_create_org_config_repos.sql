-- +goose Up
-- Create org_config_repos table
-- This table stores customer organization config repositories (where fern.config.json lives)

CREATE TABLE IF NOT EXISTS org_config_repos (
    id SERIAL PRIMARY KEY,
    customer_org_id INTEGER NOT NULL REFERENCES customer_orgs(id) ON DELETE CASCADE,
    org_name TEXT NOT NULL,
    repo_name TEXT NOT NULL,
    github_repo_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(customer_org_id, repo_name)
);

-- Create indexes for common queries
CREATE INDEX idx_org_config_repos_customer_org_id ON org_config_repos(customer_org_id);
CREATE INDEX idx_org_config_repos_created_at ON org_config_repos(created_at DESC);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_org_config_repos_updated_at
    BEFORE UPDATE ON org_config_repos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- +goose Down
-- Drop trigger and table
DROP TRIGGER IF EXISTS update_org_config_repos_updated_at ON org_config_repos;
DROP TABLE IF EXISTS org_config_repos;
