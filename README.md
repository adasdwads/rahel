# RAHEL

RAHEL is a full-stack digital legacy platform with a Node.js/Express/SQLite backend and a Flutter mobile client. It supports secure vault storage, inheritance access, charity automation, time capsules, civil-registry death triggers, and dead-man's-switch heartbeat monitoring.

## Project Structure

- `backend/` production backend API, automation flows, crypto, SQLite schema, and verification scripts
- `mobile/` Flutter mobile app with Arabic RTL-first UI and provider-based state management
- `client/` web client scaffold
- `server/` older prototype backend kept in the repository but not used for final integration

## Architecture Overview

### Backend

- Express API mounted under `/api`
- SQLite persistence via `better-sqlite3`
- JWT authentication with access and refresh tokens
- AES-256-GCM vault encryption
- Shamir-style key sharding for heir distribution
- Automation modules for:
  - civil registry webhook processing
  - post-death protocol execution
  - charity disbursement routing
  - heartbeat escalation
  - time capsule queueing and delivery
- Audit logging for security-sensitive actions

### Mobile

- Flutter app with Arabic locale and RTL layout
- Provider-based state management
- Service layer for auth, vault, charity, heartbeat, inheritance, wallet, and audit APIs

## Backend Setup

1. Open a terminal in `backend/`
2. Install dependencies:
   - `npm install`
3. Optional environment variables:
   - `PORT`
   - `DATABASE_PATH`
   - `APP_BASE_URL`
   - `JWT_SECRET`
   - `JWT_REFRESH_SECRET`
   - `JWT_EXPIRES_IN`
   - `JWT_REFRESH_EXPIRES_IN`
   - `CIVIL_REGISTRY_WEBHOOK_SECRET`
   - `DEAD_MAN_SWITCH_DAYS`
   - `CORS_ORIGINS`
   - `UAE_PASS_ENVIRONMENT`
   - `UAE_PASS_CLIENT_ID`
   - `UAE_PASS_CLIENT_SECRET`
   - `UAE_PASS_REDIRECT_URI`
   - `UAE_PASS_SCOPE`
4. Start the API:
   - development: `npm run dev`
   - production: `npm start`

Default backend URL: `http://localhost:3000`

## Mobile Setup

1. Open a terminal in `mobile/`
2. Install Flutter dependencies:
   - `flutter pub get`
3. Run static analysis:
   - `dart analyze`
   - or `flutter analyze`
4. Launch the app:
   - `flutter run`

## Final API List

### Health

- `GET /api/health`

### Authentication

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/biometric-verify`
- `POST /api/auth/uae-pass/authorize`
- `POST /api/auth/uae-pass/callback`
- `POST /api/auth/refresh-token`

### Users

- `GET /api/users`
- `GET /api/users/:id`
- `PUT /api/users/:id`

### Secure Vault

- `GET /api/secure-vault`
- `GET /api/secure-vault/:id`
- `POST /api/secure-vault`
- `PUT /api/secure-vault/:id`
- `DELETE /api/secure-vault/:id`

### Inheritance Access

- `GET /api/inheritance-access`
- `GET /api/inheritance-access/:id`
- `POST /api/inheritance-access`
- `PUT /api/inheritance-access/:id`
- `DELETE /api/inheritance-access/:id`

### Charity Flows

- `GET /api/charity-flows`
- `GET /api/charity-flows/:id`
- `POST /api/charity-flows`
- `PUT /api/charity-flows/:id`
- `DELETE /api/charity-flows/:id`

### Time Capsules

- `GET /api/time-capsules`
- `GET /api/time-capsules/:id`
- `POST /api/time-capsules`
- `PUT /api/time-capsules/:id`
- `DELETE /api/time-capsules/:id`

### Wallet

- `POST /api/wallet/fund`
- `GET /api/wallet/balance`

### Social Legacy

- `GET /api/social/platforms`
- `POST /api/social/connect`
- `DELETE /api/social/disconnect`
- `POST /api/social/post`
- `GET /api/social-legacy/configs`
- `POST /api/social-legacy/platform`
- `DELETE /api/social-legacy/platform/:configID`
- `POST /api/social-legacy/self-destruct/add`
- `PUT /api/social-legacy/self-destruct/:itemID/confirm`
- `DELETE /api/social-legacy/self-destruct/:itemID`

### Heartbeat / Dead Man's Switch

- `POST /api/heartbeat/ping`
- `GET /api/heartbeat/status`
- `PUT /api/heartbeat/config`

### Webhooks

- `POST /api/webhooks/civil-registry`

### Audit

- `GET /api/audit-logs`

## Verified Integration Flows

### Death Trigger Flow

Verified end-to-end with:

- user registration and login
- heir creation
- secure vault file creation
- key shard assignment
- wallet funding
- charity flow creation
- time capsule creation
- verified civil registry webhook trigger
- user status transition to `Triggered`
- charity payment processing
- shard release logging
- time capsule queueing
- audit log generation

### Dead Man's Switch Flow

Verified with:

- heartbeat config update
- heartbeat ping response
- simulated inactivity
- first escalation step returning `PingSent`
- second escalation step returning `Escalated`

### Crypto Verification

Verified with:

- file encryption
- shard splitting
- key reconstruction from threshold shards
- successful decryption back to original plaintext

## Verification Script

The repository includes an automated backend integration verifier:

- `backend/scripts/integrationVerify.js`

Run it with:

- `node backend/scripts/integrationVerify.js`

It starts the backend on an isolated port, exercises the critical APIs, simulates the death-trigger and heartbeat flows, and validates crypto reconstruction/decryption.

## Notes

- The active backend for final integration is `backend/`, not `server/`.
- Binary payloads are transported as base64 strings in API requests and responses where applicable.
- The backend auto-creates the SQLite database on startup.
- UAE PASS supports both staging (`https://stg-id.uaepass.ae`) and production (`https://id.uaepass.ae`) through environment configuration.
- Mobile deep-link callback should be configured for `rahel://uae-pass/callback` in Android `AndroidManifest.xml` and iOS `Info.plist`.