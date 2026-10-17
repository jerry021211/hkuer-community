// vite.config.ts / vite.config.js
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({mode}) => ({
  plugins: [vue(), ...(mode==='mesh'?[]:[vueDevTools()])],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/java': {
        target: loadEnv(mode,process.cwd(),'').VITE_API_PROXY || 'http://localhost:9090',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/java/, '') // 将 /java 前缀移除，后端接收的是 /user/xxx
      },
    },
  },
}))
