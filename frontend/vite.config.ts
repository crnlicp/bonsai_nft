import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'url';
import environment from 'vite-plugin-environment';
import { copyFileSync } from 'fs';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '../', '');
  const isLocalNetwork = (env.DFX_NETWORK || 'local') !== 'ic';

  return {
    base: '/',
    plugins: [
      react(),
      environment('all', { prefix: 'CANISTER_' }),
      environment('all', { prefix: 'DFX_' }),
      {
        name: 'copy-ic-assets',
        closeBundle() {
          // Copy .ic-assets.json5 to dist folder after build
          try {
            copyFileSync('.ic-assets.json5', 'dist/.ic-assets.json5');
          } catch (e) {
            console.warn('Could not copy .ic-assets.json5:', e);
          }
          // Copy index.html as 200.html for SPA fallback routing
          try {
            copyFileSync('dist/index.html', 'dist/200.html');
          } catch (e) {
            console.warn('Could not copy 200.html:', e);
          }
        }
      }
    ],
    envDir: '../',
    define: {
      'import.meta.env.CANISTER_ID_INTERNET_IDENTITY': JSON.stringify(env.CANISTER_ID_INTERNET_IDENTITY || 'umunu-kh777-77774-qaaca-cai'),
      'import.meta.env.CANISTER_ID_BACKEND': JSON.stringify(env.CANISTER_ID_BACKEND),
      'import.meta.env.CANISTER_ID_ICP_LEDGER_CANISTER': JSON.stringify(env.CANISTER_ID_ICP_LEDGER_CANISTER),
      'import.meta.env.DFX_NETWORK': JSON.stringify(env.DFX_NETWORK || 'local')
    },
    optimizeDeps: {

      esbuildOptions: {
        define: {
          global: 'globalThis'
        },
        alias: isLocalNetwork
          ? {
            '@dfinity/ledger-icp': fileURLToPath(new URL('./src/stubs/ledger-stub.ts', import.meta.url)),
            '@icp-sdk/canisters/ledger/icp': fileURLToPath(new URL('./src/stubs/ledger-stub.ts', import.meta.url)),
            '@dfinity/identity/lib/cjs/identity/partial': fileURLToPath(new URL('./src/stubs/identity-stub.ts', import.meta.url))
          }
          : {}
      },
    },
    resolve: {
      alias: [
        {
          find: 'declarations',
          replacement: fileURLToPath(new URL('../src/declarations', import.meta.url))
        },
        {
          find: '@',
          replacement: fileURLToPath(new URL('./src', import.meta.url))
        },
        ...(isLocalNetwork
          ? [
            {
              find: '@dfinity/ledger-icp',
              replacement: fileURLToPath(new URL('./src/stubs/ledger-stub.ts', import.meta.url))
            },
            {
              find: '@icp-sdk/canisters/ledger/icp',
              replacement: fileURLToPath(new URL('./src/stubs/ledger-stub.ts', import.meta.url))
            },
            {
              find: '@dfinity/identity/lib/cjs/identity/partial',
              replacement: fileURLToPath(new URL('./src/stubs/identity-stub.ts', import.meta.url))
            }
          ]
          : [])
      ]
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:4943',
          changeOrigin: true
        }
      },
      host: '127.0.0.1'
    },
    preview: {
      host: '127.0.0.1',
      historyApiFallback: true
    }
  };
});
