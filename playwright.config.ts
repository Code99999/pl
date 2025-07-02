import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: { acceptDownloads: true },
});