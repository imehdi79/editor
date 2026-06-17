import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

import { cloudflare } from "@cloudflare/vite-plugin";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    babel({ presets: [reactCompilerPreset()] }),
    cloudflare()
  ],
  server: {
    port: 3030,
  },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Split heavy, stable vendors into their own cacheable chunks. The
        // `three` chunk is only referenced by the lazily-imported 3D view, so
        // it stays out of the initial mobile download until 3D is opened.
        // (Function form: rolldown types `manualChunks` as a function. The
        // regexes match the package directory right after node_modules so
        // `react-konva` lands in `konva`, never `react`.)
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (/[\\/]node_modules[\\/](three|three-stdlib|@react-three)[\\/]/.test(id)) return "three";
          if (/[\\/]node_modules[\\/](konva|react-konva)[\\/]/.test(id)) return "konva";
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return "react";
          if (/[\\/]node_modules[\\/]@tanstack[\\/]/.test(id)) return "query";
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});