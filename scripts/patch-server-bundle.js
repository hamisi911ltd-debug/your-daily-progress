#!/usr/bin/env node
// Rollup's cross-chunk re-export of d1.ts (used by many lazily-loaded route chunks,
// e.g. creators.functions/profile.functions, which dynamically `import()` server.js
// and destructure d1One/d1All/d1Run off a namespace object) emits a spec-compliant
// ES module namespace object with `__proto__: null`. Cloudflare's Durable Object
// deploy validation walks every top-level export of the Worker script and rejects
// any whose prototype chain doesn't reach Object.prototype — a null-proto object
// fails that check (error 10021, "prototype chain does not end in Object"), even
// though nothing binds to it directly; it's purely an internal chunk-linking
// artifact. Stripping the null-proto override is safe: property access on the
// object (n.e.d1One(...)) is unaffected by its prototype.
import { readFileSync, writeFileSync } from "node:fs";

const path = "dist/server/server.js";
const original = readFileSync(path, "utf8");
const patched = original.replace(/\n\s*__proto__: null,/g, "");

if (patched === original) {
  console.warn(
    "patch-server-bundle: no `__proto__: null` pattern found in dist/server/server.js — " +
      "Rollup's output may have changed; verify the Durable Object still deploys."
  );
} else {
  writeFileSync(path, patched);
  console.log("patch-server-bundle: stripped null-prototype namespace object(s) from dist/server/server.js");
}
