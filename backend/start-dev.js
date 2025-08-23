import dotenv from 'dotenv';
import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

// Load environment variables
config({ path: resolve(__dirname, '.env') });

// Import and start server
import('./server.js');
