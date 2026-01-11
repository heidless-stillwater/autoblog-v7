/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/perplexity': {
        target: 'https://api.perplexity.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/perplexity/, ''),
      },
      '/api/gemini': {
        target: 'https://generativelanguage.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/gemini/, ''),
      },
      '/api/vault': {
        target: 'https://imageprompt-v1-dev.web.app/api',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/vault/, ''),
      },
      '/api/vault-local': {
        target: 'http://localhost:3000/api',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/vault-local/, ''),
      },
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    css: true,
  }
})
