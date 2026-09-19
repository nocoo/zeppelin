import { defineConfig } from "vite";
import { execFileSync } from "node:child_process";
import manifest from "./package.json" with { type: "json" };

function releaseMetadata() {
  // Release workflows check out the proven SHA; their GITHUB_SHA may refer to a different event.
  const metadata = () =>
    JSON.stringify({
      status: "ok",
      name: manifest.name,
      version: manifest.version,
      revision: execFileSync("git", ["rev-parse", "HEAD"], {
        encoding: "utf8",
      }).trim(),
    });
  return {
    name: "release-metadata",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (new URL(request.url, "http://localhost").pathname !== "/api/live")
          return next();
        response.setHeader("Content-Type", "application/json; charset=utf-8");
        response.setHeader("Cache-Control", "no-store");
        if (!["GET", "HEAD"].includes(request.method)) {
          response.statusCode = 405;
          response.setHeader("Allow", "GET, HEAD");
          return response.end(
            JSON.stringify({ status: "error", error: "Method not allowed" }),
          );
        }
        response.end(request.method === "HEAD" ? undefined : metadata());
      });
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "api/live.json",
        source: metadata(),
      });
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [releaseMetadata()],
  server: {
    host: "127.0.0.1",
    port: 7052,
    strictPort: true,
    allowedHosts: ["zeppelin.dev.hexly.ai"],
  },
  preview: {
    host: "127.0.0.1",
    port: 7052,
    strictPort: true,
    allowedHosts: ["zeppelin.dev.hexly.ai"],
  },
});
