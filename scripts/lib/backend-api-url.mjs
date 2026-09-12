/**
 * Validates BACKEND_API_URL for Netlify /api proxy generation.
 * @param {string | undefined} raw
 * @param {{ production: boolean }} opts
 * @returns {string | null}
 */
export function normalizeBackendApiOrigin(raw, { production }) {
  const trimmed = raw?.trim();
  if (!trimmed) {
    if (production) {
      throw new Error(
        "BACKEND_API_URL is required for Netlify production. Set it in Site settings → Environment variables (API origin only, no trailing /api), e.g. https://api.example.com",
      );
    }
    return null;
  }

  let origin = trimmed.replace(/\/+$/, "");
  if (/\/api$/i.test(origin)) {
    throw new Error(
      "BACKEND_API_URL must be the API origin only (no trailing /api). Example: https://api.example.com",
    );
  }

  let parsed;
  try {
    parsed = new URL(origin);
  } catch {
    throw new Error("BACKEND_API_URL must be a valid absolute URL.");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("BACKEND_API_URL must use http or https.");
  }

  const port = parsed.port || (parsed.protocol === "https:" ? "443" : "80");
  if (port === "8082") {
    throw new Error(
      "BACKEND_API_URL must not use port 8082 (host-local ops port). Use your public HTTPS API hostname instead.",
    );
  }

  if (production) {
    if (parsed.protocol !== "https:") {
      throw new Error("BACKEND_API_URL must use https in production Netlify deploys.");
    }
    if (/^\d+\.\d+\.\d+\.\d+$/.test(parsed.hostname)) {
      throw new Error(
        "BACKEND_API_URL must not be a raw IP in production. Use your public API hostname (TLS certificate).",
      );
    }
  }

  return origin;
}

/**
 * @param {NodeJS.ProcessEnv} env
 * @param {{ production: boolean }} opts
 * @returns {string | null}
 */
export function resolveBackendApiOrigin(env, { production }) {
  try {
    return normalizeBackendApiOrigin(env.BACKEND_API_URL, { production });
  } catch (primaryError) {
    const message = primaryError instanceof Error ? primaryError.message : String(primaryError);
    const canonical = env.BACKEND_API_URL_CANONICAL?.trim();
    if (!canonical) {
      throw primaryError;
    }
    console.warn(`${message} Using BACKEND_API_URL_CANONICAL instead.`);
    return normalizeBackendApiOrigin(canonical, { production: true });
  }
}
