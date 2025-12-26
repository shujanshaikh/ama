import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useUserStream, createRpcCaller } from '@/hooks/use-user-stream';

interface UserStreamContextValue {
    status: 'connecting' | 'connected' | 'disconnected' | 'error';
    cliConnected: boolean;
    call: <T = unknown>(method: string, input?: Record<string, unknown>, timeoutMs?: number) => Promise<T>;
    requestCliStatus: () => void;
    isReady: boolean;
    rpc: ReturnType<typeof createRpcCaller>;
}

const UserStreamContext = createContext<UserStreamContextValue | null>(null);

interface UserStreamProviderProps {
    userId: string | undefined;
    children: ReactNode;
}

export function UserStreamProvider({ userId, children }: UserStreamProviderProps) {
    const { status, cliConnected, call, requestCliStatus, isReady } = useUserStream(userId);

    const rpc = useMemo(() => createRpcCaller(call), [call]);

    const value = useMemo<UserStreamContextValue>(() => ({
        status,
        cliConnected,
        call,
        requestCliStatus,
        isReady,
        rpc,
    }), [status, cliConnected, call, requestCliStatus, isReady, rpc]);

    return (
        <UserStreamContext.Provider value={value}>
            {children}
        </UserStreamContext.Provider>
    );
}

export function useUserStreamContext() {
    const context = useContext(UserStreamContext);
    if (!context) {
        throw new Error('useUserStreamContext must be used within a UserStreamProvider');
    }
    return context;
}


export function useUserStreamContextOptional() {
    return useContext(UserStreamContext);
}
