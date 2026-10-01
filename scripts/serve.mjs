import { start } from './lib/server.mjs';
const { port } = await start(Number(process.argv[2]) || 4173);
console.log(`serving dist on http://localhost:${port}`);
