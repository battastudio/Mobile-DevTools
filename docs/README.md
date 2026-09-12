# Mobile DevTools — Documentation

The documentation site for [Mobile DevTools](https://github.com/battastudio/Mobile-DevTools),
a zero-dependency, self-hosted toolkit for Flutter mobile teams. Built with
[Astro Starlight](https://starlight.astro.build/).

**Published at:** <https://battastudio.github.io/Mobile-DevTools/>

## Develop

```bash
npm install
npm run dev        # local dev server with live reload
npm run build      # production build → dist/
npm run preview    # serve the production build locally
```

## Deploy

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the site
and publishes it to GitHub Pages. (Repo → Settings → Pages → Source must be set
to **GitHub Actions**.)
