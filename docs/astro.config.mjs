// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// Deployed to GitHub Pages at https://battastudio.github.io/Mobile-DevTools/
// (project page → base path must match the repo name).
export default defineConfig({
  site: 'https://battastudio.github.io',
  base: '/Mobile-DevTools',
  integrations: [
    starlight({
      title: 'Mobile DevTools',
      description: 'A zero-dependency, self-hosted toolkit for Flutter mobile teams.',
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/battastudio/Mobile-DevTools' }],
      sidebar: [
        { label: 'Start here', autogenerate: { directory: 'start' } },
        { label: 'Build Helper', autogenerate: { directory: 'build-helper' } },
        { label: 'Mobile QA', autogenerate: { directory: 'mobile-qa' } },
        { label: 'Mobile Security', autogenerate: { directory: 'mobile-security' } },
        { label: 'Flutter Launchpad', autogenerate: { directory: 'flutter-launchpad' } },
        { label: 'Reference', autogenerate: { directory: 'reference' } },
      ],
    }),
  ],
});
