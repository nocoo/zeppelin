import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
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
