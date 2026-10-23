import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.test.ts', '**/*.test.tsx'],
    environment: 'node',
    globals: true,
    typecheck: { tsconfig: 'tsconfig.json' },
  },
});