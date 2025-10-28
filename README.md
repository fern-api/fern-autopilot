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

<br>
<br>

# Setting Up a Development GitHub App for Autopilot

## Overview

There is no way to copy a GitHub App for development purposes. To avoid breaking production when testing new features, you should spin up a new GitHub App for development and testing.

## Dev Environment Setup Guide
This section will walk you through how to create a Dev Version of the Autopilot App, a Dummy Repo to trigger events, and a setting up a Webhook to the Autopilot code.

### 1. Create New GitHub App

1. Log into GitHub as **Fern Support**
2. Navigate to the [fern-demo organization's GitHub Apps settings](https://github.com/organizations/fern-demo/settings/apps)
4. Click **New GitHub App**
5. Set the following settings:
    1. Give the app a unique name in **GitHub App name**
    2. Add a unique description
    3. Set **Homepage URL** to `https://www.buildwithfern.com`
    4. Set **Callback URL** to `https://github.com/`
    3. Disable the **Webhook** → **Active** checkbox and leave that section blank for now
    4. Repository Permissions:  
        - **Actions**: `Read and write`
        - **Commit statuses**: `Read only`
        - **Contents**: `Read only`
        - **Metadata**: `Read only` (Mandatory)
        - **Pull Requests**: `Read and write`
        - **Webhooks**: `Read and write`
        - **Workflows**: `Read and write`
    5. Set the radio box for `Where can this GitHub App be installed?` to `Any account`
6. Click **Create GitHub App**

> **TODO**: Determine if we also need secrets and variables permissions for running workflows. 

> **TODO**: Determine if we need any adiitional settings or need to change URLs

### 2. Generate and Save Private Key for Your Dev App

1. After creating the app, scroll down to the **Private keys** section on the **General** tabe of the settings.
2. Click **Generate a private key**
3. Save the `.pem` file locally in a secure location

> **TODO**: Store this key in 1Password?

> **TODO**: Cycle before production use


### 3. Open a Tunnel to Fern Autopilot for Testing

1. Clone the [fern-autopilot repository](https://github.com/fern-api/fern-autopilot)
2. Open a terminal at the root of the cloned repository. 
3. Install dependencies:
```bash
pnpm install
```
4. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```
5. In the **.env** file make the following changes:
  - Paste in the **App ID** from your Dev App's **General** settings tab for the **APP_ID**
  - Write in a value for the **WEBHOOK_SECRET**. This is text you write in, it should have high entropy and should be stored in 1Password (will need it later in the **Webhook** settings of the Dev App)
  - Copy your secret key file to the root of your local checkout and open it in VS Code. Copy the contents to the **PRIVATE_KEY** 
6. Open two, new terminals.
7. In one, start the docker instance with the following command:
```bash
pnpm docker:up
```
8. Start a live log to your docker compose instance:
```bash
docker compose logs -f
```
9. In the other terminal, create a tunnel to the docker instance:
```bash
pnpm tunnel
```
**Note: The tunnel will stay open until an error, cancellation or something else stops it (and if you run into issues during development, verify your tunnel is still running)**

10. The output of the tunnel command will give you a temporarily link that tunnels to your Docker instance. Note this the "Tunnel Link" for use in next steps


### 4. Create Dummy Repository for Testing

1. No special requirements here, just need a dummy repo to play with. You can generate a blank one or make a copy of an existing repo in **fern-demo**.

### 5. Install and Connect the App

1. On your app settings page, switch to the **Install App** tab
2. Click **Install** to install the app on the **fern-demo** org
3. Click the gear icon to access the app settings for this org
4. Set the following settings:
   - Change the radio button to **Only select repositories**
   - Select your dummy test repository from the dropdown

### 6. Link Your Dev App to Your Tunnel

1. Go back to the settings of your Dev App
2. Navigate to the **General** tab
3. Find the **Webhook** section and change the following settings:
  - Enable the **Active** checkbox
  - Paste in your Tunnel Link with an appended `/api/webhook/` for the **Webhook URL**
  - Paste in the same **Secret** that you entered for the **WEBHOOK_SECRET** in your **.env** file
  - Disable SSL verification
4. Click **Save changes**

> **TODO**: Re-enable SSL verification eventually


### 7. Verify Your Connections:

1. Assuming that your tunnel and docker logs are still running in their terminals, push a commit to your Dummy Repo (on the default branch). If everything is working, you should be able to see the following:
  - On your Dev App settings, go to the **Advanced** tab. You should see a package under **Recent Deliveries**. You can click on the package to get information about it (to verify it is from the push you just made). This verifies the connection of your Dummy Repo to your Dev App.
  - In your terminal where you are receiving docker logs, you should see a log about the recent push. This verifies the connection of your Dev App to your locally running instance of the **Autopilot** code.
3. If at any point you need to restart your tunnel, note that you will need to update your Dev App's **Webhook URL** (be sure to include the appended `/api/webhook`)
