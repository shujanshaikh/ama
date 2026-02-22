import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useUserStream, createRpcCaller } from '@/hooks/use-user-stream';
import { useTRPC } from '@/utils/trpc';

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
    const trpc = useTRPC();
    const { data: tokenData } = useQuery({
        ...trpc.apiKeys.getGatewayToken.queryOptions(),
        enabled: !!userId,
        staleTime: 50 * 60 * 1000,
        refetchInterval: 50 * 60 * 1000,
    });
    const token = tokenData?.token;
    const { status, cliConnected, call, requestCliStatus, isReady } = useUserStream(userId, token);

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
