import React, { useState, useRef, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import ACTIONS from '../Actions';
import Client from '../components/Client';
import Editor from '../components/Editor';
import { initSocket } from '../socket';
import {
    useLocation,
    useNavigate,
    Navigate,
    useParams,
} from 'react-router-dom';

const EditorPage = () => {
    const socketRef = useRef(null);
    const codeRef = useRef(null);
    const messageInputRef = useRef('');
    const location = useLocation();
    const { roomId } = useParams();
    const reactNavigator = useNavigate();
    const username = location.state?.username;
    const [clients, setClients] = useState([]);
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [socketInstance, setSocketInstance] = useState(null);

    useEffect(() => {
        const init = async () => {
            socketRef.current = await initSocket();
            const socket = socketRef.current;
            setSocketInstance(socket);
            socket.on('connect_error', (err) => handleErrors(err));
            socket.on('connect_failed', (err) => handleErrors(err));

            function handleErrors(e) {
                console.log('socket error', e);
                toast.error('Socket connection failed, try again later.');
                reactNavigator('/');
            }

            socket.emit(ACTIONS.JOIN, {
                roomId,
                username,
            });

            // Listening for joined event
            socket.on(
                ACTIONS.JOINED,
                ({ clients, username: joinedUsername, socketId }) => {
                    if (joinedUsername !== username) {
                        toast.success(`${joinedUsername} joined the room.`);
                        console.log(`${joinedUsername} joined`);
                    }
                    setClients(clients);
                    socket.emit(ACTIONS.SYNC_CODE, {
                        code: codeRef.current,
                        socketId,
                    });
                }
            );

            // Listening for disconnected
            socket.on(
                ACTIONS.DISCONNECTED,
                ({ socketId, username }) => {
                    toast.success(`${username} left the room.`);
                    setClients((prev) => {
                        return prev.filter(
                            (client) => client.socketId !== socketId
                        );
                    });
                }
            );

            socket.on(ACTIONS.CHAT_HISTORY, (messages) => {
                setChatMessages(messages || []);
            });

            socket.on(ACTIONS.RECEIVE_MESSAGE, (message) => {
                setChatMessages((prev) => [...prev, message]);
            });
        };
        init();
        return () => {
            const socket = socketRef.current;
            if (socket) {
                socket.disconnect();
                socket.off(ACTIONS.JOINED);
                socket.off(ACTIONS.DISCONNECTED);
                socket.off(ACTIONS.CHAT_HISTORY);
                socket.off(ACTIONS.RECEIVE_MESSAGE);
            }
            setSocketInstance(null);
        };
    }, [reactNavigator, roomId, username]);

    useEffect(() => {
        messageInputRef.current = chatInput;
    }, [chatInput]);

    async function copyRoomId() {
        try {
            await navigator.clipboard.writeText(roomId);
            toast.success('Room ID has been copied to your clipboard');
        } catch (err) {
            toast.error('Could not copy the Room ID');
            console.error(err);
        }
    }

    function leaveRoom() {
        reactNavigator('/');
    }

    function sendMessage() {
        const message = messageInputRef.current.trim();
        if (!message || !socketRef.current) {
            return;
        }

        socketRef.current.emit(ACTIONS.SEND_MESSAGE, {
            roomId,
            username,
            message,
        });
        setChatInput('');
    }

    function handleChatEnter(e) {
        if (e.code === 'Enter') {
            sendMessage();
        }
    }

    const handleCodeChange = useCallback((code) => {
        codeRef.current = code;
    }, []);

    if (!location.state) {
        return <Navigate to="/" />;
    }

    return (
        <div className="mainWrap">
            <div className="aside">
                <div className="asideInner">
                    <div className="logo">
                        <img
                            className="logoImage"
                            src="/code-sync.png"
                            alt="logo"
                        />
                    </div>
                    <h3>Connected</h3>
                    <div className="clientsList">
                        {clients.map((client) => (
                            <Client
                                key={client.socketId}
                                username={client.username}
                            />
                        ))}
                    </div>
                </div>
                <button className="btn copyBtn" onClick={copyRoomId}>
                    Copy ROOM ID
                </button>
                <button className="btn leaveBtn" onClick={leaveRoom}>
                    Leave
                </button>
            </div>
            <div className="editorWrap">
                {socketInstance ? (
                    <Editor
                        socket={socketInstance}
                        roomId={roomId}
                        onCodeChange={handleCodeChange}
                    />
                ) : (
                    <div className="editorLoading">Connecting editor...</div>
                )}
            </div>
            <div className="chatWrap">
                <h3>Session Chat</h3>
                <div className="chatMessages">
                    {chatMessages.length === 0 ? (
                        <p className="chatHint">No messages yet.</p>
                    ) : (
                        chatMessages.map((chatMessage, index) => (
                            <div
                                className="chatMessage"
                                key={`${chatMessage.createdAt}-${index}`}
                            >
                                <div className="chatMessageMeta">
                                    <strong>{chatMessage.username}</strong>
                                    <span>
                                        {new Date(
                                            chatMessage.createdAt
                                        ).toLocaleTimeString()}
                                    </span>
                                </div>
                                <p>{chatMessage.message}</p>
                            </div>
                        ))
                    )}
                </div>
                <div className="chatComposer">
                    <input
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyUp={handleChatEnter}
                        type="text"
                        placeholder="Type a message"
                    />
                    <button className="btn joinBtn" onClick={sendMessage}>
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditorPage;
