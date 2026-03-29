

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Set environment variables before starting the server:

```bash
MONGO_URI=<your_mongodb_connection_string>
REACT_APP_BACKEND_URL=http://localhost:5000
```

3. Start frontend and backend in separate terminals:

```bash
npm run start:front
npm run server:dev
```

## Deploy To Render

This project can be deployed as a single Render Web Service (Express serves the React build).

### Option A: Blueprint (recommended)

1. Push this repo to GitHub.
2. In Render, click **New +** -> **Blueprint**.
3. Select your repo. Render will detect `render.yaml`.
4. Set environment variables:
	- `MONGO_URI` = your MongoDB connection string
	- `FRONTEND_URL` (optional) = your Render service URL (example: `https://realtime-code-editor.onrender.com`)
	  - If omitted, server will use Render's `RENDER_EXTERNAL_URL` automatically.
5. Create the service and wait for deploy.

### Option B: Manual Web Service

1. In Render, click **New +** -> **Web Service**.
2. Connect your repo.
3. Set:
	- Build Command: `npm install && npm run build`
	- Start Command: `npm start`
4. Add environment variables:
	- `MONGO_URI`
	- `FRONTEND_URL` (optional, your Render app URL)

After deploy, open your Render URL and test creating/joining a room.

## Chat Persistence API

Get chat history for a session by room ID:

```http
GET /api/sessions/:roomId/chat-history
```

Example:

```http
GET /api/sessions/abc-123/chat-history
```
