import { appendFile, mkdir } from "node:fs/promises";
import { resolveBackendApiOrigin } from "./lib/backend-api-url.mjs";

const context = process.env.CONTEXT ?? "";
const isNetlifyBuild = process.env.NETLIFY === "true" || context !== "";
const isProductionDeploy = context === "production";

const backendOrigin = resolveBackendApiOrigin(process.env, {
  production: isProductionDeploy,
});

if (!backendOrigin) {
  if (isNetlifyBuild) {
    console.warn(
      `BACKEND_API_URL is not set (CONTEXT=${context || "unknown"}). Skipping /api proxy for this deploy preview/build.`,
    );
  } else {
    console.log("BACKEND_API_URL is not set; skipping the optional Netlify API proxy.");
  }
  process.exit(0);
}

await mkdir("dist", { recursive: true });
await appendFile("dist/_redirects", `/api/*  ${backendOrigin}/api/:splat  200!\n`, "utf8");
console.log(`Wrote Netlify /api proxy -> ${backendOrigin}/api/:splat`);
