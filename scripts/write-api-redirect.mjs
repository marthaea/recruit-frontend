import { appendFile, mkdir } from "node:fs/promises";

const backendOrigin = process.env.BACKEND_API_URL?.trim().replace(/\/+$/, "");
const context = process.env.CONTEXT ?? "";
const isNetlifyBuild = process.env.NETLIFY === "true" || context !== "";
const isProductionDeploy = context === "production";

if (!backendOrigin) {
  if (isProductionDeploy) {
    throw new Error(
      "BACKEND_API_URL is required for Netlify production. Set it to the API origin only (no trailing /api), e.g. https://api.example.com",
    );
  }

  if (isNetlifyBuild) {
    console.warn(
      `BACKEND_API_URL is not set (CONTEXT=${context || "unknown"}). Skipping /api proxy for this deploy preview/build.`,
    );
  } else {
    console.log("BACKEND_API_URL is not set; skipping the optional Netlify API proxy.");
  }
  process.exit(0);
}

const parsedOrigin = new URL(backendOrigin);
if (!["http:", "https:"].includes(parsedOrigin.protocol)) {
  throw new Error("BACKEND_API_URL must use http or https.");
}

await mkdir("dist", { recursive: true });
await appendFile("dist/_redirects", `/api/*  ${backendOrigin}/api/:splat  200!\n`, "utf8");
console.log(`Wrote Netlify /api proxy -> ${backendOrigin}/api/:splat`);
