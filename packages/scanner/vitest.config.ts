import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

// Resolve workspace packages from source so tests never require a build step.
export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@sitehealth\/shared$/,
        replacement: resolve(__dirname, '../shared/src/index.ts'),
      },
      {
        find: /^@sitehealth\/shared\/(.*)$/,
        replacement: resolve(__dirname, '../shared/src/$1'),
      },
    ],
  },
  test: {
    include: ['**/*.test.ts', '**/*.test.tsx'],
    environment: 'node',
    globals: true,
    typecheck: { tsconfig: 'tsconfig.json' },
  },
});
