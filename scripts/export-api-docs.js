// Ghi docs/openapi.json và docs/postman_collection.json từ route + schema đang có (T01.5, T11.2).
//   npm run docs:export                      baseUrl mặc định http://localhost:3000/it4788
//   npm run docs:export -- https://abc.def/it4788
import { writeFileSync } from 'node:fs';
import { apiRouter } from '../src/routes/index.js';
import { env } from '../src/config/env.js';
import { buildOpenApi, toPostman } from '../src/docs/openapi.js';

const baseUrl = process.argv[2] ?? `http://localhost:${env.PORT}${env.API_PREFIX}`;
const spec = buildOpenApi(apiRouter, env.API_PREFIX);
writeFileSync(new URL('../docs/openapi.json', import.meta.url), `${JSON.stringify(spec, null, 2)}\n`);
const collection = toPostman(spec, baseUrl);
writeFileSync(new URL('../docs/postman_collection.json', import.meta.url), `${JSON.stringify(collection, null, 2)}\n`);
const count = Object.values(spec.paths).reduce((n, m) => n + Object.keys(m).length, 0);
console.log(`docs/openapi.json + docs/postman_collection.json: ${count} API, ${collection.item.length} nhóm`);
process.exit(0);
