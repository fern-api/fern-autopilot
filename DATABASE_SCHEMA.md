```mermaid
erDiagram
    CUSTOMER_ORGS {
        uuid id
        string name
    }

    CUSTOMER_ORGS ||--o{ ORG_SDK_REPOS : contains
    CUSTOMER_ORGS ||--o{ ORG_CONFIG_REPOS : contains

    ORG_SDK_REPOS {
        uuid id
        string github_org
        string github_repo
        enum repo_type "typescript|python|java|go|ruby|csharp|swift|kotlin|php"
        bool is_active
    }

    ORG_CONFIG_REPOS {
        uuid id
        string github_org
        string github_repo
        bool is_active
    }

    GENERATOR_RUNS {
        uuid id
        string github_workflow_run_id(nullable)
        string api_name
        enum generator_id "fernapi/fern-python-sdk|fernapi/fern-java-sdk|fernapi/fern-typescript-sdk|etc"
        string generator_version
        enum status "pending|in_progress|success|failed|cancelled"
    }

    ORG_CONFIG_REPOS ||--o{ GENERATOR_RUNS : triggers

    GENERATOR_RUNS ||--o{ ORG_SDK_REPOS : targets

    GITHUB_WORKFLOWS {
        string id
        string github_org
        string github_repo
        string workflow_url
        string commit_sha
    }

    GENERATOR_RUNS ||--o{ GITHUB_WORKFLOWS : associated_with
```