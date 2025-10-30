-- +goose Up
-- Create customer_orgs table
-- This table stores customer organizations using Fern

CREATE TABLE IF NOT EXISTS customer_orgs (
    id SERIAL PRIMARY KEY,
    org_name TEXT NOT NULL UNIQUE,
    github_org TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes for common queries
CREATE INDEX idx_customer_orgs_github_org ON customer_orgs(github_org);
CREATE INDEX idx_customer_orgs_created_at ON customer_orgs(created_at DESC);

-- Create updated_at trigger function
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';
-- +goose StatementEnd

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_customer_orgs_updated_at
    BEFORE UPDATE ON customer_orgs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- +goose Down
-- Drop trigger and function first, then table
DROP TRIGGER IF EXISTS update_customer_orgs_updated_at ON customer_orgs;
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP TABLE IF EXISTS customer_orgs;
