import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  cacheDir: ".vitest",
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    environmentMatchGlobs: [
      ["tests/unit/components/**", "jsdom"],
      ["tests/unit/pages/**", "jsdom"],
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "tests/",
        "**/*.config.*",
        "**/dist/",
        "**/.next/",
        "prisma/",
        "**/*.d.ts",
      ],
    },
    testTimeout: 5000,
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: false,
        minThreads: 1,
        maxThreads: 6,
      },
    },
    include: ["tests/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", "dist", ".next", "**/*.d.ts"],
    transformMode: {
      web: [/\.[jt]sx?$/],
      ssr: [/\.[jt]sx?$/],
    },
    env: {},
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
  envPrefix: [],
});
