### Demo

https://code-sync.codersgyan.com/

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

## Chat Persistence API

Get chat history for a session by room ID:

```http
GET /api/sessions/:roomId/chat-history
```

Example:

```http
GET /api/sessions/abc-123/chat-history
```

Response shape:

```json
{
	"roomId": "abc-123",
	"messages": [
		{
			"roomId": "abc-123",
			"username": "john",
			"message": "Hello team",
			"createdAt": "2026-03-29T12:00:00.000Z"
		}
	]
}
```
