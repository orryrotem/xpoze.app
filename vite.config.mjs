import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'node:path';
import { apiMiddleware, createPostService } from './server/x-api.mjs';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'X_');
  const service = createPostService({ token: process.env.X_BEARER_TOKEN ?? env.X_BEARER_TOKEN, directory: resolve('.data/posts') });
  return {
    plugins: [{
      name: 'x-post-api',
      configureServer(server) { server.middlewares.use(apiMiddleware(service)); },
      configurePreviewServer(server) { server.middlewares.use(apiMiddleware(service)); },
    }],
  };
});
