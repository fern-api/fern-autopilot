import { initializeServer } from "./server.ts";
import logger from "./logger.ts";

// Start the server
initializeServer().catch((error) => {
  logger.error("Failed to start server:", error);
  process.exit(1);
});
