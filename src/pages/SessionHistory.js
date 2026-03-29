import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useParams } from 'react-router-dom';
import { getBackendBaseUrl } from '../utils/backendUrl';

const SessionHistory = () => {
    const { roomId } = useParams();
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchHistory() {
            try {
                const res = await fetch(
                    `${getBackendBaseUrl()}/api/sessions/${roomId}/chat-history`
                );
                if (!res.ok) {
                    throw new Error('Could not load history');
                }

                const data = await res.json();
                setMessages(data.messages || []);
            } catch (error) {
                toast.error('Failed to load chat history for this session');
            } finally {
                setLoading(false);
            }
        }

        fetchHistory();
    }, [roomId]);

    return (
        <div className="historyPageWrapper">
            <div className="historyCard">
                <div className="historyHeader">
                    <h2>Session Chat History</h2>
                    <p>Session ID: {roomId}</p>
                </div>

                {loading ? (
                    <p>Loading messages...</p>
                ) : messages.length === 0 ? (
                    <p>No saved chat messages were found for this session.</p>
                ) : (
                    <div className="historyMessages">
                        {messages.map((msg) => (
                            <div
                                key={`${msg._id || msg.createdAt}-${msg.username}`}
                                className="historyMessage"
                            >
                                <div className="historyMeta">
                                    <strong>{msg.username}</strong>
                                    <span>
                                        {new Date(msg.createdAt).toLocaleString()}
                                    </span>
                                </div>
                                <p>{msg.message}</p>
                            </div>
                        ))}
                    </div>
                )}

                <Link to="/" className="btn leaveBtn backBtn">
                    Back To Home
                </Link>
            </div>
        </div>
    );
};

export default SessionHistory;
