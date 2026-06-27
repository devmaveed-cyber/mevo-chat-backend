# Mevo Chat Backend

Node.js + Express + MongoDB + Socket.io backend for **1-on-1 chat**, **audio calls**, and **video calls**.

Uses the same Agora project as **PK Matchz** for RTC token generation.

## Stack

- Express REST API
- MongoDB + Mongoose
- JWT authentication
- Socket.io for real-time chat, typing, read receipts, and call signaling
- Agora RTC token server (`agora-access-token`)

## Setup

```bash
cd "Mevo_chat_backend"
cp .env.example .env
npm install
npm run dev
```

Default port: `5001`

## Dedicated MongoDB Atlas Project (recommended)

Mevo Chat should use its **own Atlas project** (not shared with `crud-with-mongo`).

One-time setup (requires Atlas CLI login):

```bash
brew install mongodb-atlas-cli   # if not installed
atlas auth login                 # browser opens — sign in with your Atlas account
bash scripts/setup-mevo-atlas.sh
```

This script will:
1. Create Atlas project **"Mevo Chat"**
2. Create M0 cluster **MevoCluster0**
3. Create DB user + network access
4. Migrate existing `mevo_chat` data from the old cluster
5. Update `.env` with the new connection string

To migrate manually to an existing URI:

```bash
node scripts/migrate-mevo-data.js "mongodb+srv://user:pass@host/mevo_chat?..."
```

## Environment

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | JWT signing secret |
| `AGORA_APP_ID` | Agora App ID (same as PK Matchz) |
| `AGORA_APP_CERTIFICATE` | Agora App Certificate (server-side only) |
| `CLIENT_ORIGIN` | Allowed CORS/Socket origin |

## Main API Routes

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

### Users
- `GET /api/users/search?q=`
- `GET /api/users/:id`
- `PATCH /api/users/me`

### Chat (1-on-1)
- `GET /api/conversations`
- `POST /api/conversations` `{ participantId }`
- `GET /api/conversations/:conversationId/messages`
- `POST /api/conversations/:conversationId/messages`
- `PATCH /api/conversations/:conversationId/read`

### Calls
- `POST /api/calls/initiate` `{ receiverId, callType: "audio"|"video" }`
- `PATCH /api/calls/status` `{ callId, status }`
- `GET /api/calls/history`

### Agora
- `GET /api/agora/config`
- `POST /api/agora/token` `{ channelName, uid, role? }`

## Socket.io

Connect with auth token:

```js
io('http://localhost:5001', {
  auth: { token: '<jwt>' }
});
```

Events:
- `send_message`
- `message_sent`
- `message_delivered`
- `message_read`
- `typing` / `stop_typing`
- `call_invite` / `call_accept` / `call_reject` / `call_cancel` / `call_end`
- `user_online` / `user_offline`

## Notes

- Only **1-on-1** conversations are supported.
- Agora App ID can be exposed to the Flutter app; certificate must stay on the server.
- Update `MONGODB_URI` in `.env` before running in production.
