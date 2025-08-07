import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// vite.config.js
export default {
    server: {
        host: "127.0.0.1",
        strictPort: true,
        proxy: {
            '/api': {
                target: 'http://localhost:8000',
                changeOrigin: true,
            }, '/recommender': {
                target: 'http://localhost:8000',
                changeOrigin: true,
            }
        },
    },
    base: "/FindMySound/",
    build: {
        outDir: 'dist',
    },

}
