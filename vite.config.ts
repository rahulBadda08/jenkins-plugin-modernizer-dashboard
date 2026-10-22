import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Support for both GitHub Pages (rahulBadda08.github.io/...) 
// and official Jenkins infra (stats.jenkins.io/...)
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || '/jenkins-plugin-modernizer-dashboard/',
  build: {
    // 1.8MB all_plugins.json bundle is ~1.5MB after compilation (103 kB gzipped)
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'vendor-react',
              test: /node_modules[\\/](react|react-dom)[\\/]/,
            },
            {
              name: 'vendor-charts',
              test: /node_modules[\\/](echarts|echarts-for-react|zrender)[\\/]/,
            },
            {
              name: 'vendor-excel',
              test: /node_modules[\\/]exceljs[\\/]/,
            },
          ],
        },
      },
    },
  },
});