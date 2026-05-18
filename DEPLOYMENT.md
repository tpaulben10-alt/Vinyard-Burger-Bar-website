# Vinyard Burger Bar Deployment

## Aiven MySQL

1. Create or open the Aiven MySQL service.
2. Copy the host, port, user, password, and database name into `.env` locally or Render env vars.
3. Keep `DB_SSL=true`.
4. If Aiven gives you a CA certificate, paste the full PEM text into `DB_CA_CERT` in Render. Newline-escaped text also works.
5. Check the connection:

```bash
npm run db:check
```

6. Create tables and seed menu items:

```bash
npm run seed
```

7. Create the first admin:

```bash
$env:ADMIN_EMAIL="admin@vinyard.com"
$env:ADMIN_PASSWORD="change-this-password"
$env:ADMIN_NAME="Vinyard Admin"
npm run admin:create
```

## Render Web Service

Use `render.yaml` or create a Node Web Service manually.

Required environment variables:

- `NODE_ENV=production`
- `PORT=3000`
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `DB_SSL=true`
- `DB_SSL_REJECT_UNAUTHORIZED=true`
- `DB_CA_CERT` if Aiven requires the CA certificate
- `JWT_SECRET` with a long random value

Render commands:

- Build: `npm ci`
- Start: `npm start`

After deploy, open `/health` to confirm the web service is live. Login, menu, orders, and admin screens require the Aiven schema and seeded data.
