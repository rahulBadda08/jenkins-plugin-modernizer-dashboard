import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Support for both GitHub Pages (rahulBadda08.github.io/...) 
// and official Jenkins infra (stats.jenkins.io/...)
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || '/jenkins-plugin-modernizer-dashboard/',
})