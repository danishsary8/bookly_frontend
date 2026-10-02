// Regenerates src/api/schema.d.ts from the API's OpenAPI description.
//   npm run api:types                         -> live API
//   OPENAPI_SOURCE=../bookly_backend_v2/public/openapi.yaml npm run api:types   -> local backend checkout
import { execFileSync } from "node:child_process";

const source = process.env.OPENAPI_SOURCE || "https://bookly-api-zasc.onrender.com/openapi.yaml";
console.log(`Generating API types from ${source}`);
execFileSync("npx", ["openapi-typescript", source, "-o", "src/api/schema.d.ts", "--root-types"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});
