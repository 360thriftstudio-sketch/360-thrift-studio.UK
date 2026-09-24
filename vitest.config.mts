import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.ts'],
      thresholds: {
        // Spec: lib/pricing.ts must have 100% unit-test coverage.
        'src/lib/pricing.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
      },
    },
  },
})
