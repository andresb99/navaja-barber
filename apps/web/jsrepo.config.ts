import { defineConfig } from 'jsrepo';

export default defineConfig({
  registries: ['https://reactbits.dev/r'],
  paths: {
    component: './components/reactbits',
    hook: './hooks',
    lib: './lib',
    ui: './components/ui',
  },
});
