import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import vue from '@astrojs/vue';

// https://astro.build/config
export default defineConfig({
  legacy: {
    collectionsBackwardsCompat: true
  },
  output: 'server',
  adapter: node({
    mode: 'standalone'
  }),
  integrations: [vue()],
  server: {
    port: 4327,
    host: 'localhost',
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Access-Control-Allow-Origin': 'http://localhost:4327',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept, Origin',
      'Access-Control-Allow-Credentials': 'true'
    }
  },
  build: {
    server: './dist/server/'
  }
}); 
