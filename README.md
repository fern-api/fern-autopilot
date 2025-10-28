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
   - `APP_ID`: Your GitHub App ID (found in APp settings)
   - `WEBHOOK_SECRET`: The webhook secret you set in your GitHub App settings (CHRIS TODO - this is from test repo, not app settings, I think?)
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

<br>
<br>

# Setting Up a Development GitHub App for Autopilot

## Overview

There is no way to copy a GitHub App for development purposes. To avoid breaking production when testing new features, you should spin up a new GitHub App for development and testing.

## Dev Environment Setup Guide
This section will walk you through how to create a Dev Version of the Autopilot App, a Dummy Repo to trigger events, and a setting up a Tunnel Link between them via the Autopilot code.

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

### 3. Create Dummy Repository for Testing

1. No special requirements here to start, just need a dummy repo to play with. You can generate a blank one or make a copy of an existing repo in **fern-demo**.

### 4. Install and Connect the App

1. On your app settings page, switch to the **Install App** tab
2. Click **Install** to install the app on the **fern-demo** org
3. Click the gear icon to access the app settings for this org
4. Set the following settings:
   - Change the radio button to **Only select repositories**
   - Select your dummy test repository from the dropdown

### 5. Open a Tunnel to Fern Autopilot for Testing

1. Clone the [fern-autopilot repository](https://github.com/fern-api/fern-autopilot)
2. Open a terminal at the root of the cloned repository. 
3. Follow the steps in the [Setup](#setup) section of this README ???
4. Install dependencies:
```bash
pnpm install
```
5. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```
6. Open a new, separate terminal.
7. Start the docker instance with the following command:
```bash
pnpm docker:up
```
8. Once that is done, create a tunnel to the docker instance:
```bash
pnpm tunnel
```
**Note: The tunnel will stay open until an error, cancellation or something else stops it (and if you run into issues during development, verify your tunnel is still running)**

9. The output of the tunnel command will give you a temporarily link that tunnels to your Docker instance. Note this "tunnel link" for use in next steps

### 6. Link Your Dummy Repo to Your Tunnel

1. Go back to your Dummy Repo settings
2. Navigate to the **Webhooks** tab
3. Click **Add Webhook**
4. Change the following settings
  - Paste in your Tunnel Link (as is) to the **Payload URL**
  - Change **Content type** to `application/json`
  - Write in a **Secret**. This is text you write in, it should have high entropy and should be stored in 1Password (will need it later in the Autopilot **.env** variables)
  - Disable the checkbox for **SSL verification**
  - Chang **Which events would you like to trigger this webhook?** to `Send me everything`
  - Enable checkbox for `Active`
5. Click `Add webhook`

> **TODO**: Formalize secret creation and saving here?

> **TODO**: Re-enable SSL verification eventually

> **TODO**: Send everything option or something more restrictive?

> **TODO**: Cycle secret before production use

### 7. Link Your Dev App to Your Tunnel

1. Go back to the settings of your Dev App
2. Navigate to the **General** tab
3. Find the **Webhook** section and change the following settings:
  - Enable the **Active** checkbox
  - Paste in your Tunnel Link with an appended `/api/webhook/` for the **Webhook URL**
  - Paste in the same **Secret** that you entered for the **Webhook** in your Dummy Repo
  - Disable SSL verification
4. Click **Save changes**

> **TODO**: Re-enable SSL verification eventually

### 8. Add Remaining Environment Variables to Your Autopilot Code

1. Go back to your checked out repository for **Autopilot**
2. In the **.env** file make the following changes:
  - Paste in the **App ID** from your Dev App **General** settings tab for the **APP_ID**
  - Paste in the same **Secret** for the **WEBHOOK_SECRET** that you entered for the **Webhook** in your Dummy Repo and the Dev App settings
  - Copy the private key you generated and saved locally for your Dev App to the root of your checked out **Autopilot** repository. Enter the relative location of the file for `PRIVATE_KEY_PATH`

> **TODO**: How to set **PRIVATE_KEY**?

### 9. Verify Your Connections:

1. Assuming that your tunnel is still running, open a new terminal and run this command to start running your Dev App code:
```bash
pnpm dev
```
2. Push a commit to your Dummy Repo (on the default branch). If everything is working, you should be able to see the following:
  - On your Dev App settings, go to the **Advanced** tab. You should see a package under **Recent Deliveries**. You can click on the package to get information about it (to verify it is from the push you just made). This verifies the connection of your Dummy Repo to your Dev App.
  - In your terminal where you ran `pnpm dev`, you should see a log about the recent push. This verifies the connection of your Dev App to your locally running instance of the **Autopilot** code.
3. If at any point you need to restart your tunnel, note that you will need to update your Dummy Repo's **Webhook**'s **Payload URL** _and_ your Dev App's **Webhook URL** (be sure to include the appended `/api/webhook` to this one), and then rerun the `pnpm dev` command in your terminal and try again.

<br>

## Debugging Your Code

### Debugging Prequisites
- Make sure the app is already setup such that you can receive events to your checked out code as according to the [Setup Guide](#dev-environment-setup-guide)

### Start Dev Environment Options
There are a few ways to run the code. You can choose what works best for you based on the debugging you are doing. Both methods still require docker to be running in the background with the `pnpm docker:up` command and an activated/linked tunnel as defined in the **Setup Guide** from [Debugging Prequisites](#debugging-requisites)
- Start your dev environment by running `pnpm dev` in the terminal, as you did in the setup guide
- _Without_ running `pnpm dev` in the terminal, you can use VS Code's **Run and Debug** tab to select and run **Debug Server** or **Debug Server (Watch Mode)**:
    1. In a terminal, run:
    ```bash
    cp debugConfig/launch.json .vscode/launch.json
    ``` 
    2. Both of these debugging paths will start the application with the allowed use of breakpoints. The only difference between them is a `--watch` command line parameter. **Debug Server (Watch Mode)** allows for iterable code changes and restarts the server on a file save. **Debug Server** mode should be more stable but will require manual restarting of the debugger and relevant pieces of the app.
