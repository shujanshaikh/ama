export interface RpcCall {
  _tag: 'rpc_call';
  requestId: string;
  method: string;
  input: Record<string, unknown>;
}

export interface RpcResult<T = unknown> {
  _tag: 'rpc_result';
  requestId: string;
  data: T;
}

export interface RpcError {
  _tag: 'rpc_result';
  requestId: string;
  data: {
    _tag: string;
    message: string;
  };
}
export type RpcMessage = RpcCall | RpcResult | RpcError;

// Generate unique request ID
export const generateRequestId = () =>
  `${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
