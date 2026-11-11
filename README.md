# K&M

K&M is a responsive poultry marketplace and farm-business UI built with React, TypeScript, Vite, Tailwind CSS, Lucide React, React Router, and Recharts. A small Node/Express API provides shared user accounts, role-based access, and persistent login sessions using SQLite.

## Run locally

1. Install Node.js 20.19+.
2. Run `npm install`.
3. Run `npm run dev`.
4. Open the Vite URL printed in the terminal (usually <http://localhost:5173>).

The development command starts both the Vite frontend and the API. SQLite data is stored in `data/k-and-m.sqlite` and is excluded from Git. Set `DB_PATH` to use another database file.

To try the same local server from another device on your network, open `http://<computer-LAN-IP>:5173` on that device and allow inbound connections to port 5173 in the host firewall. Accounts and sessions are shared because both devices connect to the same API and database. For use outside your local network, deploy the app and API behind HTTPS with persistent database storage.

## Development demo accounts

Demo accounts are seeded only when `NODE_ENV` is not `production` and `KM_SEED_DEMO_USERS` is not `false`.

| Role | Email | Password |
|---|---|---|
| Farmer | `farmer@kandm.rw` | `demo123` |
| Buyer | `buyer@kandm.rw` | `demo123` |
| Delivery agent | `delivery@kandm.rw` | `demo123` |
| Administrator | `admin@kandm.rw` | `demo123` |

These are development-only credentials. Production startup does not seed them.

## Production setup

Build the frontend with `npm run build`, then start the combined static app and API with `npm start` under `NODE_ENV=production`. The server listens on port 3000 by default; configure `PORT` as needed.

The first production administrator must be provisioned with `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD` (at least 12 characters), and optionally `BOOTSTRAP_ADMIN_NAME`. Keep these values private and configure them through the hosting provider's secret/environment settings, not source control. The bootstrap email must not already belong to a non-admin account. The application refuses to start in production if no administrator exists.

Persist the SQLite database directory across deployments and backups. For multi-instance deployments, SQLite on local disk is not a shared database; use a shared production database before scaling horizontally. HTTPS is required in production because session cookies are marked `Secure`.

## Accounts and access

- Sign-up supports farmer/seller, buyer, and delivery-agent roles. Administrator accounts are provisioned separately.
- Passwords are hashed with Node.js `scrypt`; the browser only receives an HTTP-only session cookie. Session tokens are stored as hashes and expire after seven days.
- Dashboard routes and administrator user-management endpoints enforce roles on both the frontend and API.
- Admins can view accounts and verify farmer or delivery-agent profiles.
- Sign-out invalidates the current server session. A new device must sign in unless it has its own valid session cookie.
- Password recovery currently directs users to contact the administrator; email-based reset is not configured.

## Current UI scope

Marketplace listings, cart, checkout confirmation, dashboards, and farm statistics use illustrative frontend sample data. The authentication, sessions, and administrator account list are backed by the local Express/SQLite API. Payment methods are visual previews only: no payment details are collected and no transactions are processed. Other marketplace and farm workflows are not persisted to the API.

Run `npm run build` to type-check and create the production frontend in `dist/`.
