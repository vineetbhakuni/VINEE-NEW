import React, { useCallback, useEffect, useRef } from 'react';
import MonacoEditor from '@monaco-editor/react';
import ACTIONS from '../Actions';

const Editor = ({ socket, roomId, onCodeChange }) => {
    const editorRef = useRef(null);
    const isApplyingRemoteChangeRef = useRef(false);

    const handleEditorMount = useCallback((editor) => {
        editorRef.current = editor;
    }, []);

    const handleEditorChange = useCallback(
        (value) => {
            const code = value ?? '';
            onCodeChange(code);

            if (!isApplyingRemoteChangeRef.current && socket) {
                socket.emit(ACTIONS.CODE_CHANGE, {
                    roomId,
                    code,
                });
            }
        },
        [onCodeChange, roomId, socket]
    );

    useEffect(() => {
        if (!socket) {
            return undefined;
        }

        socket.on(ACTIONS.CODE_CHANGE, ({ code }) => {
            if (code === null || !editorRef.current) {
                return;
            }

            const nextCode = code ?? '';
            const currentCode = editorRef.current.getValue();

            if (currentCode !== nextCode) {
                isApplyingRemoteChangeRef.current = true;
                editorRef.current.setValue(nextCode);
                isApplyingRemoteChangeRef.current = false;
            }
        });

        return () => {
            socket.off(ACTIONS.CODE_CHANGE);
        };
    }, [socket]);

    return (
        <div className="editorContainer">
            <MonacoEditor
                language="javascript"
                theme="vs-dark"
                defaultValue=""
                onMount={handleEditorMount}
                onChange={handleEditorChange}
                width="100%"
                height="100%"
                options={{
                    fontSize: 18,
                    lineHeight: 30,
                    minimap: { enabled: false },
                    automaticLayout: true,
                    autoClosingBrackets: 'always',
                    autoClosingQuotes: 'always',
                }}
            />
        </div>
    );
};

export default Editor;
