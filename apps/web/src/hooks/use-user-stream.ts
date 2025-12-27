import { WS_URL } from '@/utils/constant';
import { useEffect, useRef, useCallback, useState } from 'react';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface PendingCall<T = unknown> {
    resolve: (data: T) => void;
    reject: (error: RpcError) => void;
    timeout: ReturnType<typeof setTimeout>;
}

interface RpcError {
    _tag: string;
    message: string;
    type?: string;
    requestId?: string;
}

interface CliStatus {
    _tag: 'cli_status';
    status: 'connected' | 'disconnected';
    timestamp: number;
}

interface RpcResult<T = unknown> {
    _tag: 'rpc_result';
    requestId: string;
    data: T;
}

interface RpcErrorResponse {
    _tag: 'rpc_error';
    requestId: string;
    type: 'no_cli_connected' | 'timeout' | 'error';
    message: string;
}

type WebSocketMessage = CliStatus | RpcResult | RpcErrorResponse | { _tag: 'cli_status_response'; connected: boolean };

const generateRequestId = () =>
    `${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;

// const getWsUrl = () => {
//     const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
//     return apiUrl.replace(/^http/, 'wss').replace(/\/api\/v1$/, '');
// };

export function useUserStream(userId: string | undefined) {
    const wsRef = useRef<WebSocket | null>(null);
    const pendingCalls = useRef<Map<string, PendingCall>>(new Map());
    const [status, setStatus] = useState<ConnectionStatus>('disconnected');
    const [cliConnected, setCliConnected] = useState(false);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isUnmountedRef = useRef(false);

    useEffect(() => {
        if (!userId) {
            setStatus('disconnected');
            setCliConnected(false);
            return;
        }

        isUnmountedRef.current = false;

        const connect = () => {
            if (isUnmountedRef.current) return;

            const wsUrl = `${WS_URL}/api/v1/user-streams?userId=${userId}&type=frontend`;

            setStatus('connecting');
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                if (isUnmountedRef.current) {
                    ws.close();
                    return;
                }
                setStatus('connected');
            };

            ws.onclose = (_event) => {
                if (isUnmountedRef.current) return;

                setStatus('disconnected');
                setCliConnected(false);

                pendingCalls.current.forEach((pending, requestId) => {
                    clearTimeout(pending.timeout);
                    pending.reject({
                        _tag: 'ConnectionClosedError',
                        message: 'WebSocket connection closed',
                        requestId : requestId
                    });
                });
                pendingCalls.current.clear();

                if (!isUnmountedRef.current) {
                    reconnectTimeoutRef.current = setTimeout(connect, 3000);
                }
            };

            ws.onerror = () => {
                if (isUnmountedRef.current) return;
                setStatus('error');
            };

            ws.onmessage = (event) => {
                if (isUnmountedRef.current) return;

                try {
                    const message: WebSocketMessage = JSON.parse(event.data);

                    if (message._tag === 'cli_status') {
                        const isConnected = message.status === 'connected';
                        setCliConnected(isConnected);
                        return;
                    }

                    if (message._tag === 'cli_status_response') {
                        setCliConnected(message.connected);
                        return;
                    }

                    if (message._tag === 'rpc_result') {
                        const pending = pendingCalls.current.get(message.requestId);
                        if (pending) {
                            clearTimeout(pending.timeout);
                            pendingCalls.current.delete(message.requestId);

                            const data = message.data as { _tag?: string; message?: string };
                            if (data && typeof data === 'object' && data._tag && data._tag !== 'success') {
                                if (data.message) {
                                    pending.reject(data as RpcError);
                                    return;
                                }
                            }

                            pending.resolve(message.data);
                        }
                        return;
                    }

                    if (message._tag === 'rpc_error') {
                        const pending = pendingCalls.current.get(message.requestId);
                        if (pending) {
                            clearTimeout(pending.timeout);
                            pendingCalls.current.delete(message.requestId);
                            pending.reject({
                                _tag: message.type,
                                message: message.message,
                                type: message.type,
                            });
                        }
                        return;
                    }
                } catch (err) {
                    console.error('[useUserStream] Failed to parse message:', err);
                }
            };
        };

        connect();

        return () => {
            isUnmountedRef.current = true;

            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }

            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }

            pendingCalls.current.forEach((pending) => {
                clearTimeout(pending.timeout);
            });
            pendingCalls.current.clear();
        };
    }, [userId]);

    const call = useCallback(<T = unknown>(
        method: string,
        input: Record<string, unknown> = {},
        timeoutMs: number = 30000
    ): Promise<T> => {
        return new Promise((resolve, reject) => {
            if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
                reject({
                    _tag: 'NotConnectedError',
                    message: 'WebSocket not connected',
                });
                return;
            }

            const requestId = generateRequestId();

            const timeout = setTimeout(() => {
                pendingCalls.current.delete(requestId);
                reject({
                    _tag: 'TimeoutError',
                    message: `RPC call timed out after ${timeoutMs}ms`,
                });
            }, timeoutMs);

            pendingCalls.current.set(requestId, {
                resolve: resolve as (data: unknown) => void,
                reject,
                timeout,
            });

            wsRef.current.send(JSON.stringify({
                _tag: 'rpc_call',
                requestId,
                method,
                input,
            }));

            console.log('[useUserStream] RPC call:', method, requestId);
        });
    }, []);

    const requestCliStatus = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ _tag: 'cli_status_request' }));
        }
    }, []);

    return {
        status,
        cliConnected,
        call,
        requestCliStatus,
        isReady: status === 'connected',
    };
}

export function createRpcCaller(call: ReturnType<typeof useUserStream>['call']) {
    return {
        getWorkspaceFolders: () =>
            call<{ folders: Array<{ id: string; cwd: string; name: string; active: boolean }> }>('daemon:get_workspace_folders'),

        getEnvironment: (gitRepositoryUrl: string) =>
            call<{ project: { id: string; cwd: string; name: string } }>('daemon:get_environment', { gitRepositoryUrl }),

        getContext: (cwd: string) =>
            call<{ files: string[]; cwd: string }>('daemon:get_context', { cwd }),

        getIdeProjects: () =>
            call<{ projects: Array<{ name: string; path: string; type: string }> }>('daemon:get_ide_projects'),

        registerProject: (projectId: string, cwd: string, name?: string) =>
            call<{ success: boolean; projectId: string; cwd: string }>('daemon:register_project', { projectId, cwd, name }),

        unregisterProject: (projectId: string) =>
            call<{ success: boolean; projectId: string }>('daemon:unregister_project', { projectId }),

        getProject: (projectId: string) =>
            call<{ project: { id: string; cwd: string; name: string; active: boolean } }>('daemon:get_project', { projectId }),

        listProjects: () =>
            call<{ projects: Array<{ id: string; cwd: string; name: string; active: boolean }> }>('daemon:list_projects'),

        getStatus: () =>
            call<{ connected: boolean; timestamp: number; platform: string; arch: string }>('daemon:status'),
    };
}
