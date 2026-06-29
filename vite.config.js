import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');
  
  // Safely polyfill process.env for Create React App compatibility
  const processEnv = {
    'process.env.NODE_ENV': JSON.stringify(mode)
  };
  
  // Expose REACT_APP_ variables
  for (const key in env) {
    if (key.startsWith('REACT_APP_')) {
      processEnv[`process.env.${key}`] = JSON.stringify(env[key]);
    }
  }

  return {
    plugins: [react()],
    server: {
      port: 3000,
      open: false,
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
        '/uploads': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        }
      }
    },
    define: processEnv,
    build: {
      outDir: 'build', // match CRA's output directory
    }
  };
});
