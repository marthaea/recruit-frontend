import test from "node:test";
import assert from "node:assert/strict";
import { normalizeBackendApiOrigin, resolveBackendApiOrigin } from "./backend-api-url.mjs";

test("accepts HTTPS origin in production", () => {
  assert.equal(
    normalizeBackendApiOrigin("https://api.example.com", { production: true }),
    "https://api.example.com",
  );
});

test("rejects port 8082", () => {
  assert.throws(
    () => normalizeBackendApiOrigin("http://127.0.0.1:8082", { production: false }),
    /8082/,
  );
});

test("rejects raw IP in production", () => {
  assert.throws(
    () => normalizeBackendApiOrigin("https://203.0.113.1", { production: true }),
    /raw IP/,
  );
});

test("rejects trailing /api", () => {
  assert.throws(
    () => normalizeBackendApiOrigin("https://api.example.com/api", { production: true }),
    /trailing \/api/,
  );
});

test("falls back to BACKEND_API_URL_CANONICAL when primary uses port 8082", () => {
  assert.equal(
    resolveBackendApiOrigin(
      {
        BACKEND_API_URL: "http://67.205.157.80:8082",
        BACKEND_API_URL_CANONICAL: "https://api.example.com",
      },
      { production: true },
    ),
    "https://api.example.com",
  );
});
