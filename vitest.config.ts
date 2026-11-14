import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'

const src = fileURLToPath(new URL('./src', import.meta.url))

// `server-only` throws unless loaded by a React Server bundler. Node unit tests aren't one, so
// they get the package's own empty module. The real build still enforces the boundary.
const serverOnlyStub = fileURLToPath(
  new URL('./node_modules/server-only/empty.js', import.meta.url),
)

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': src },
  },
  test: {
    globals: true,
    passWithNoTests: true,
    projects: [
      {
        extends: true,
        resolve: {
          alias: { 'server-only': serverOnlyStub },
        },
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'browser',
          include: ['src/**/*.browser.test.tsx'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
})
