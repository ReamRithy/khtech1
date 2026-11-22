# KH Tech

React storefront with a shopping bag, product filters, saved favorites, and browser-local demo checkout.

## Local development

```powershell
npm.cmd install
npm.cmd run dev
```

## GitHub Pages

Published URL: https://reamrithy.github.io/khtech1/

In the repository's **Settings > Pages > Build and deployment**, set **Source** to **GitHub Actions**.
The deployment workflow runs on pushes to `main`, builds with the `/khtech1/` asset base, and publishes only the generated `dist/` folder.
React JSX source needs this build step; deploying `main / (root)` directly produces an empty page.

```powershell
npm.cmd run build:pages
```

For another host at the domain root, use `npm.cmd run build` instead.

Orders and favorites are stored in this browser. This demonstration does not process payments or send orders to a server.
