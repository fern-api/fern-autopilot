/**
 * Background task processing module
 *
 * Processes webhook events asynchronously on the same server
 * using Node.js EventEmitter - no external dependencies required
 */

export { initProcessor, getProcessor } from './processor.ts';
