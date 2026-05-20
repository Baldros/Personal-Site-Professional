# Hostinger Deployment Notes

Yes: you can develop locally with Bun, build the site, and deploy it to Hostinger.

The important choice is whether the Hostinger plan will run server-side Node.js.

## Recommended Path

Use Hostinger VPS or a Node-capable hosting plan.

This project uses Astro server output because future features need backend routes:

- OAuth callbacks.
- Token refresh.
- X spend controls.
- Atlas streaming.
- API calls that must keep secrets server-side.

Build locally or on the server:

```bash
bun install
bun run build
```

Run the built Node server:

```bash
node ./dist/server/entry.mjs
```

Point the domain to the Node app through Hostinger's Node/VPS setup or a reverse proxy.

## Static Hosting Alternative

If you only want a static portfolio, change `astro.config.mjs` to static output and remove server endpoints.

Tradeoff:

- Static hosting is simpler and cheaper.
- OAuth and official API calls need a separate backend.

For this project, server output is the better default because the API and Atlas roadmap are part of the goal.
