import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.tsx"],
    clearMocks: true,
    testTimeout: 12000,
  },
  resolve: {
    alias: [
      {
        find: "@/public",
        replacement: path.resolve(__dirname, "./public"),
      },
      {
        find: "@",
        replacement: path.resolve(__dirname, "./src"),
      },
    ],
  },
});
