import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv, transformWithOxc } from 'vite'
import react from '@vitejs/plugin-react'

const configDir = path.dirname(fileURLToPath(import.meta.url))
const jsxInJsPattern = /\/src\/.*\.js$/

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, configDir, '')
  const apiProxyTarget = env.API_PROXY_TARGET || env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:5001'

  return {
    plugins: [
      {
        name: 'treat-js-files-as-jsx',
        enforce: 'pre',
        transform(code, id) {
          const [filepath] = id.split('?')

          if (!jsxInJsPattern.test(filepath)) {
            return null
          }

          return transformWithOxc(code, filepath, {
            lang: 'jsx',
            jsx: {
              runtime: 'automatic',
            },
          })
        },
      },
      react(),
    ],
    server: {
      proxy: {
        '/resources': apiProxyTarget,
        '/login': apiProxyTarget,
        '/v1': apiProxyTarget,
        '/queue': apiProxyTarget,
        '/socket.io': { target: apiProxyTarget, ws: true },
      },
    },
    css: {
      modules: {
        localsConvention: 'camelCase',
      },
      preprocessorOptions: {
        scss: {
          quietDeps: true,
          silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'if-function'],
        },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/setupTests.js',
      clearMocks: true,
      coverage: {
        provider: 'v8',
        reportsDirectory: '../react-coverage',
      },
    },
  }
})
