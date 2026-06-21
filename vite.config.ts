import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { Plugin } from "vite";

// Stub for Cloudflare runtime built-ins that don't exist in Node.js dev mode.
// The real modules are provided by the Workers runtime at deploy time.
function cloudflareDevStubPlugin(): Plugin {
  const CLOUDFLARE_BUILTINS = ["cloudflare:workers", "cloudflare:sockets"];
  return {
    name: "cloudflare-dev-stub",
    enforce: "pre",
    resolveId(id) {
      if (CLOUDFLARE_BUILTINS.includes(id)) return `\0${id}`;
    },
    load(id) {
      if (CLOUDFLARE_BUILTINS.includes(id.replace("\0", ""))) {
        // Return a minimal stub — DurableObject is the only export used locally
        return `export class DurableObject {}; export default {};`;
      }
    },
  };
}

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    build: { rollupOptions: { external: ["cloudflare:workers"] } },
    plugins: [cloudflareDevStubPlugin()],
  },
});
