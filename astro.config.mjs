// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://donghotheagent.com',
  redirects: {
    '/category/buying-selling/': '/category/buy-sell/',
    '/category/rental-guide/': '/category/rent/',
    '/category/investment/': '/category/invest/',
    '/category/newcomer/': '/category/new-to-ontario/',
    '/category/mortgage/': '/category/buy-sell/',
    '/category/uncategorized/': '/category/living-in-ontario/',
  },
  devToolbar: {
    enabled: false,
  },
});
