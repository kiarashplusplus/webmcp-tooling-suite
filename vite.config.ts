import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig, type Plugin } from "vite";
import { resolve } from 'path'

const projectRoot = process.env.PROJECT_ROOT || import.meta.dirname

/**
 * Plugin to make CSS non-render-blocking
 * Converts <link rel="stylesheet"> to async loading pattern
 */
function nonBlockingCss(): Plugin {
  return {
    name: 'non-blocking-css',
    transformIndexHtml(html) {
      // Convert stylesheet links to non-blocking pattern using media="print" trick
      // This loads CSS async and applies it after load
      return html.replace(
        /<link rel="stylesheet"([^>]*) href="([^"]+)"([^>]*)>/g,
        '<link rel="stylesheet"$1 href="$2"$3 media="print" onload="this.media=\'all\'">'
      )
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    nonBlockingCss(),
  ],
  resolve: {
    alias: {
      '@': resolve(projectRoot, 'src')
    }
  },
  server: {
    port: 5000
  },
  preview: {
    port: 5000
  },
  // For GitHub Pages deployment under a subdirectory (e.g., /repo-name/)
  // Set base to './' for relative paths that work anywhere
  base: './',
  build: {
    // Generate sourcemaps for debugging
    sourcemap: true,
    // Output to dist folder
    outDir: 'dist',
    // CSS code splitting - only load CSS needed for visible components
    cssCodeSplit: true,
    // Optimize chunk size
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'radix-ui': [
            '@radix-ui/react-accordion',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip',
          ],
        }
      }
    }
  }
});
