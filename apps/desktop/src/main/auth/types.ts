import type { User } from "@workos-inc/node";

export type { User };

export const AUTH_CHANNELS = {
  SIGN_IN: "auth:sign-in",
  SIGN_OUT: "auth:sign-out",
  GET_USER: "auth:get-user",
  GET_ACCESS_TOKEN: "auth:get-access-token",
  ON_AUTH_CHANGE: "auth:on-auth-change",
} as const;

export interface AuthIpcResult {
  success: boolean;
  error?: string;
}

export interface AuthChangePayload {
  user: User | null;
}
