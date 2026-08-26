import { defineConfig, loadEnv } from 'vite'
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')
  const backendUrl = (env.VITE_BACKEND_URL || env.VITE_API_BASE_URL || 'http://127.0.0.1:8082').replace(/\/+$/, '')
  const storageUrl = (env.VITE_STORAGE_URL || 'http://127.0.0.1:9000').replace(/\/+$/, '')
  const storageSignedHost = env.VITE_STORAGE_SIGNED_HOST || 'minio:9000'

  const resolveManualChunk = (id: string) => {
    if (!id.includes('node_modules')) {
      return undefined
    }

    const packagePath = id.split('node_modules/').pop() ?? ''

    if (
      packagePath.startsWith('react/')
      || packagePath.startsWith('react-dom/')
      || packagePath.startsWith('react-router/')
      || packagePath.startsWith('scheduler/')
    ) {
      return 'vendor-react'
    }
    if (packagePath.startsWith('@radix-ui/') || packagePath.startsWith('cmdk/') || packagePath.startsWith('vaul/')) {
      return 'vendor-ui-primitives'
    }
    if (packagePath.startsWith('lucide-react/')) return 'vendor-icons'
    if (packagePath.startsWith('recharts/')) return 'vendor-charts'
    if (packagePath.startsWith('jspdf-autotable/')) return 'vendor-jspdf-autotable'
    if (packagePath.startsWith('jspdf/')) return 'vendor-jspdf'
    if (packagePath.startsWith('html2canvas/')) return 'vendor-html2canvas'
    if (packagePath.startsWith('@mediapipe/') || packagePath.includes('vision_bundle')) return 'vendor-vision'
    if (packagePath.startsWith('country-state-city/')) return undefined
    if (packagePath.startsWith('libphonenumber-js/')) return 'vendor-phone'
    if (packagePath.startsWith('date-fns/')) return 'vendor-date'
    if (packagePath.startsWith('qrcode/')) return 'vendor-qrcode'
    if (packagePath.startsWith('motion/')) return 'vendor-motion'
    if (packagePath.startsWith('@mui/') || packagePath.startsWith('@emotion/')) return 'vendor-mui'

    return 'vendor-misc'
  }

  return {
    plugins: [
      // The React and Tailwind plugins are both required for Make, even if
      // Tailwind is not being actively used – do not remove them
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        // Alias @ to the src directory
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5174,
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          headers: {
            Origin: backendUrl,
          },
        },
        '/storage': {
          target: storageUrl,
          changeOrigin: false,
          headers: {
            Host: storageSignedHost,
          },
          rewrite: (requestPath) => requestPath.replace(/^\/storage/, ''),
        },
      },
    },

    // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
    assetsInclude: ['**/*.svg', '**/*.csv'],
    build: {
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks: resolveManualChunk,
        },
      },
    },
  }
})
