import { io } from 'socket.io-client';
import { getBackendBaseUrl } from './utils/backendUrl';

export const initSocket = async () => {
    const options = {
        'force new connection': true,
        reconnectionAttempt: 'Infinity',
        timeout: 10000,
        transports: ['websocket'],
    };
    return io(getBackendBaseUrl(), options);
};
