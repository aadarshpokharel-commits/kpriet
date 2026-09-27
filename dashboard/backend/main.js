/**
 * Production Entry Point fallback for hosting platforms (Render, Heroku, etc.)
 * that default to executing `node main.js`.
 *
 * This immediately delegates execution to the compiled TypeScript server bundle.
 */
import './dist/server.js';
