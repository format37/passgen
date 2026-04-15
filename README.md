# passgen

A minimal, secure password generator web app.

**Features**
- Cryptographically secure generation via `crypto.getRandomValues()`
- Configurable length (8–64), character sets (uppercase, lowercase, digits, symbols)
- Optional exclusion of ambiguous characters (`0oOIl1i|cC`)
- Password strength scoring (zxcvbn-ts)
- Dark / light theme toggle
- One-click copy to clipboard

**Stack**: React 18 · TypeScript · Vite · Tailwind CSS v4 · nginx · Docker

---

## Run with Docker (recommended)

**Prerequisites**: Docker and Docker Compose

```bash
git clone git@github.com:format37/passgen.git
cd passgen
docker compose up -d --build
```

The app is served on port 80 inside the container. For local access, create a `docker-compose.override.yml`:

```yaml
services:
  passgen:
    ports:
      - "8020:80"
```

Then open `http://localhost:8020/passgen/`.

---

## Run in development

**Prerequisites**: Node.js 20+

```bash
git clone git@github.com:format37/passgen.git
cd passgen
npm install
npm run dev
```

Open `http://localhost:5173/passgen/`.

---

## Deploy behind Caddy

Add to your `Caddyfile`:

```caddyfile
handle_path /passgen* {
    reverse_proxy passgen:80
}
```

The `handle_path` directive strips the `/passgen` prefix before forwarding to nginx, which expects requests at `/`.

---

## Tests

```bash
# Unit + integration tests
npm test

# E2E tests (requires Docker container running on port 8020)
npx playwright test
```
