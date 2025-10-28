#!/usr/bin/env node
import dotenv from "dotenv";
import { spawn } from "child_process";

// Load environment variables from .env file
dotenv.config();

// Get PORT from environment, default to 3000
const port = process.env.PORT || "3000";

// Get subdomain from environment (optional, for stable URL)
const subdomain = process.env.TUNNEL_SUBDOMAIN;

console.log(`Starting localtunnel on port ${port}...`);
if (subdomain) {
  console.log(`Requesting subdomain: ${subdomain}.loca.lt`);
}

// Spawn localtunnel process
const args = ['--port', port];
if (subdomain) {
  args.push('--subdomain', subdomain);
}

const lt = spawn('lt', args, {
  stdio: 'inherit',
  shell: true
});

lt.on("error", (error) => {
  console.error("Failed to start localtunnel:", error);
  process.exit(1);
});

lt.on("close", (code) => {
  process.exit(code || 0);
});
