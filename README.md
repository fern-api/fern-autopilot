# GitHub App Webhook Server

A minimal Node.js server written in TypeScript that uses Octokit.js to create a GitHub App that responds to webhook events on merge to different branches and triggers dispatch workflows.

## Features

- Listens for pull request merge events
- Listens for push events
- Triggers different GitHub Actions workflows based on target branch
- Built with Express.js and TypeScript
- Uses Octokit.js for GitHub API interactions
- Structured logging with winston (configurable log levels with timestamps)
- PostgreSQL integration for tracking workflow runs (optional)

## Prerequisites

- Node.js (v18 or higher)
- pnpm (v9 or higher)
- PostgreSQL (v12 or higher) - optional, for workflow run tracking
- A GitHub App with the following permissions:
  - Repository permissions:
    - Actions: Read & Write
    - Contents: Read
    - Pull requests: Read
  - Subscribe to events:
    - Pull request
    - Push

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

3. Configure your `.env` file with your GitHub App credentials:
   - `APP_ID`: Your GitHub App ID
   - `WEBHOOK_SECRET`: The webhook secret you set in your GitHub App settings
   - `PRIVATE_KEY` (recommended): Your GitHub App's private key directly as a string (PEM format)
   - `PRIVATE_KEY_PATH` (fallback): Path to your GitHub App's private key file (e.g., `./private-key.pem`)
   - `PORT`: Server port (default: 3000)
   - `LOG_LEVEL`: Logging level (default: info). Options: error, warn, info, debug

   Database configuration (optional - only if you want to track workflow runs):
   - `DB_HOST`: PostgreSQL host (default: localhost)
   - `DB_PORT`: PostgreSQL port (default: 5432)
   - `DB_NAME`: Database name
   - `DB_USER`: Database user
   - `DB_PASSWORD`: Database password
   - `DB_POOL_MAX`: Maximum pool size (default: 20)
   - `DB_IDLE_TIMEOUT`: Idle timeout in ms (default: 30000)
   - `DB_CONNECTION_TIMEOUT`: Connection timeout in ms (default: 2000)

4. Download your GitHub App's private key from GitHub and save it as `private-key.pem` in the project root

## Development

Run in development mode with auto-reload:
```bash
pnpm dev
```

## Production

Build the TypeScript code:
```bash
pnpm build
```

Start the server:
```bash
pnpm start
```

## Endpoints

- `POST /api/webhook` - GitHub webhook endpoint
- `GET /health` - Health check endpoint


## Testing with the [Development] Fern Bot Github App
To set up the app I:
1. created a new webhook secret (should be rotated and saved in 1Pass before production use)
2. Disabled SSL for now (so I can use my local server without need to setup encryption)
3. Created a new private key (will delete before production use and create a real one to be stored in a more secure location)
4. Started a local tunnel with `pnpm tunnel`
5. Updated the [Github App Settings](https://github.com/organizations/fern-demo/settings/apps/development-fern-autopilot) with the tunnel URL as the webhook endpoint (e.g. https://short-rings-burn.loca.lt/api/webhook)
6. Restarted the app and interacted with the repo that has "[Development] Fern Bot Github App" installed
