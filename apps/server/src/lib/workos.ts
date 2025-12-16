import { WorkOS } from '@workos-inc/node';


export const workos = new WorkOS(process.env.WORKOS_API_KEY, {
    clientId: process.env.WORKOS_CLIENT_ID,
  });

export const clientId = process.env.WORKOS_CLIENT_ID!;
export const cookiePassword = process.env.WORKOS_COOKIE_PASSWORD!;

export const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
export const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
