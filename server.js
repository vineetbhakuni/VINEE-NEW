const express = require('express');
const app = express();
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const ACTIONS = require('./src/Actions');

const server = http.createServer(app);
const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:3000';
const io = new Server(server, {
    cors: {
        origin: allowedOrigin,
        methods: ['GET', 'POST'],
    },
});

const chatMessageSchema = new mongoose.Schema(
    {
        roomId: {
            type: String,
            required: true,
            index: true,
        },
        username: {
            type: String,
            required: true,
            trim: true,
        },
        message: {
            type: String,
            required: true,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

const roomCodeSchema = new mongoose.Schema(
    {
        roomId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        code: {
            type: String,
            default: '',
        },
    },
    {
        timestamps: true,
    }
);

const RoomCode = mongoose.model('RoomCode', roomCodeSchema);

async function connectToMongo() {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        console.warn('MONGO_URI not provided. Chat persistence is disabled.');
        return;
    }

    try {
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('MongoDB connection failed:', error.message);
    }
}

async function getRoomChatHistory(roomId) {
    if (mongoose.connection.readyState !== 1) {
        return [];
    }

    return ChatMessage.find({ roomId })
        .sort({ createdAt: 1 })
        .select('roomId username message createdAt')
        .lean();
}

async function persistMessage(roomId, username, message) {
    if (mongoose.connection.readyState !== 1) {
        return {
            roomId,
            username,
            message,
            createdAt: new Date(),
        };
    }

    const saved = await ChatMessage.create({ roomId, username, message });
    return {
        roomId: saved.roomId,
        username: saved.username,
        message: saved.message,
        createdAt: saved.createdAt,
    };
}

const roomCodeMap = {};

async function getRoomCode(roomId) {
    if (roomCodeMap[roomId]) {
        return roomCodeMap[roomId];
    }

    if (mongoose.connection.readyState !== 1) {
        return '';
    }

    const roomCodeDoc = await RoomCode.findOne({ roomId }).lean();
    return roomCodeDoc?.code || '';
}

async function persistRoomCode(roomId, code) {
    roomCodeMap[roomId] = code || '';

    if (mongoose.connection.readyState !== 1) {
        return;
    }

    await RoomCode.updateOne(
        { roomId },
        { $set: { code: code || '' } },
        { upsert: true }
    );
}

app.use(express.static('build'));
app.use(express.json());
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', allowedOrigin);
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }
    return next();
});

app.get('/api/sessions/:roomId/chat-history', async (req, res) => {
    const { roomId } = req.params;

    if (!roomId) {
        return res.status(400).json({ error: 'roomId is required' });
    }

    try {
        const messages = await getRoomChatHistory(roomId);
        return res.json({ roomId, messages });
    } catch (error) {
        console.error('Failed to fetch chat history:', error.message);
        return res.status(500).json({ error: 'Failed to fetch chat history' });
    }
});

app.use((req, res, next) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const userSocketMap = {};
function getAllConnectedClients(roomId) {
    // Map
    return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
        (socketId) => {
            return {
                socketId,
                username: userSocketMap[socketId],
            };
        }
    );
}

io.on('connection', (socket) => {
    console.log('socket connected', socket.id);

    socket.on(ACTIONS.JOIN, async ({ roomId, username }) => {
        userSocketMap[socket.id] = username;
        socket.join(roomId);
        const clients = getAllConnectedClients(roomId);
        clients.forEach(({ socketId }) => {
            io.to(socketId).emit(ACTIONS.JOINED, {
                clients,
                username,
                socketId: socket.id,
            });
        });

        try {
            const history = await getRoomChatHistory(roomId);
            io.to(socket.id).emit(ACTIONS.CHAT_HISTORY, history);
        } catch (error) {
            console.error('Failed to load chat history:', error.message);
        }

        try {
            const code = await getRoomCode(roomId);
            io.to(socket.id).emit(ACTIONS.CODE_CHANGE, { code });
        } catch (error) {
            console.error('Failed to load room code:', error.message);
        }
    });

    socket.on(ACTIONS.CODE_CHANGE, async ({ roomId, code }) => {
        try {
            await persistRoomCode(roomId, code);
        } catch (error) {
            console.error('Failed to persist room code:', error.message);
        }

        socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
    });

    socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
        io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
    });

    socket.on(ACTIONS.SEND_MESSAGE, async ({ roomId, username, message }) => {
        const normalizedMessage = (message || '').trim();
        if (!roomId || !username || !normalizedMessage) {
            return;
        }

        try {
            const savedMessage = await persistMessage(
                roomId,
                username,
                normalizedMessage
            );
            io.to(roomId).emit(ACTIONS.RECEIVE_MESSAGE, savedMessage);
        } catch (error) {
            console.error('Failed to persist chat message:', error.message);
        }
    });

    socket.on('disconnecting', () => {
        const rooms = [...socket.rooms];
        rooms.forEach((roomId) => {
            socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
                socketId: socket.id,
                username: userSocketMap[socket.id],
            });
        });
        delete userSocketMap[socket.id];
        socket.leave();
    });
});

const PORT = process.env.PORT || 5000;
connectToMongo().finally(() => {
    server.listen(PORT, () => console.log(`Listening on port ${PORT}`));
});
