// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv } from "vite";

// vite.config does not auto-inject .env into process.env for proxy target resolution.
const env = loadEnv(process.env.MODE ?? "development", process.cwd(), "");
const apiProxyTarget = env.VITE_DEV_API_PROXY || process.env.VITE_DEV_API_PROXY || "http://localhost:8080";

export default defineConfig({
  vite: {
    server: {
      // Local independent hosting: browser calls same-origin /api, Vite forwards to the Java API.
      // Override with VITE_DEV_API_PROXY (e.g. http://localhost:8080).
      proxy: {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true,
          // Browser still sends Origin on same-origin /api calls; Vite forwards it to
          // Java, which then rejects with 403 Invalid CORS unless 8081 is allowlisted.
          // Drop Origin so the proxied hop is treated as a non-browser server call.
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              proxyReq.removeHeader("origin");
            });
          },
        },
      },
    },
  },
  nitro: {
    preset: "netlify",
    output: {
      dir: ".netlify/functions-internal",
      serverDir: ".netlify/functions-internal/server",
      publicDir: "dist",
    },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
