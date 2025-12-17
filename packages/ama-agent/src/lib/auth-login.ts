import pc from 'picocolors'
import fs from 'fs'
import os from 'os'
import path from 'path'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const CREDENTIALS_DIR = path.join(os.homedir(), '.ama')
const CREDENTIALS_PATH = path.join(CREDENTIALS_DIR, 'credentials.json')

export function isAuthenticated(): boolean {
  try {
    if (!fs.existsSync(CREDENTIALS_PATH)) {
      return false
    }
    const raw = fs.readFileSync(CREDENTIALS_PATH, 'utf8')
    const data = JSON.parse(raw)
    return Boolean(data && data.access_token)
  } catch {
    return false
  }
}

function saveTokens(tokens: { access_token: string; refresh_token: string }) {
  try {
    if (!fs.existsSync(CREDENTIALS_DIR)) {
      fs.mkdirSync(CREDENTIALS_DIR, { recursive: true })
    }
    fs.writeFileSync(
      CREDENTIALS_PATH,
      JSON.stringify(tokens, null, 2),
      'utf8',
    )
  } catch (error) {
    console.error(pc.red('Failed to save credentials'), error)
  }
}

export function logout() {
  try {
    if (fs.existsSync(CREDENTIALS_PATH)) {
      fs.unlinkSync(CREDENTIALS_PATH)
    }
  } catch (error) {
    console.error(pc.red('Failed to logout'), error)
  }
}

export function getTokens(): { access_token: string; refresh_token: string } | null {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    return null
  }
  const raw = fs.readFileSync(CREDENTIALS_PATH, 'utf8')
  const data = JSON.parse(raw)
  return data as { access_token: string; refresh_token: string }
}

async function authorizeDevice() {
  const response = await fetch(
    'https://api.workos.com/user_management/authorize/device',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: 'client_01K4Y8A5Q3FYGXD362BJQ6AGYD',
      }),
    },
  );

  const data = await response.json();
  return data as {
    device_code: string;
    user_code: string;
    verification_uri: string;
    verification_uri_complete?: string;
    expires_in: number;
    interval: number;
  };
}

async function pollForTokens({
  clientId,
  deviceCode,
  expiresIn = 300,
  interval = 5,
}: {
  clientId: string;
  deviceCode: string;
  expiresIn?: number;
  interval?: number;
}): Promise<{
  access_token: string;
  refresh_token: string;
}> {
  const start = Date.now();

  while (true) {
    if (Date.now() - start > expiresIn * 1000) {
      throw new Error('Authorization timed out');
    }

    const response = await fetch(
      'https://api.workos.com/user_management/authenticate',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
          device_code: deviceCode,
          client_id: clientId,
        }),
      },
    );

    const data = await response.json();

    if (response.ok) {
      return data;
    }

    switch (data.error) {
      case 'authorization_pending':
        await sleep(interval * 1000);
        break;
      case 'slow_down':
        interval += 1;
        await sleep(interval * 1000);
        break;
      case 'access_denied':
      case 'expired_token':
        throw new Error('Authorization failed');
      default:
        throw new Error('Authorization failed');
    }
  }
}

export async function login() {
  try {
    const device = await authorizeDevice();

    console.log(pc.bold('To sign in, follow these steps:'));
    if (device.verification_uri_complete) {
      console.log(
        `  1. Open this URL in your browser: ${pc.cyan(
          device.verification_uri_complete,
        )}`,
      );
    } else {
      console.log(
        `  1. Open this URL in your browser: ${pc.cyan(
          device.verification_uri,
        )}`,
      );
      console.log(
        `  2. Enter this code when prompted: ${pc.bold(device.user_code)}`,
      );
    }
    console.log('  3. Come back here; we will detect when you finish logging in.');
    console.log();
    console.log(
      pc.gray(
        `Waiting for authorization (expires in ~${Math.round(
          device.expires_in / 60,
        )} minutes)...`,
      ),
    );

    const tokens = await pollForTokens({
      clientId: 'client_01K4Y8A5Q3FYGXD362BJQ6AGYD',
      deviceCode: device.device_code,
      expiresIn: device.expires_in,
      interval: device.interval,
    });

    console.log(pc.green('Successfully authenticated!'));
    saveTokens(tokens)
    return tokens;
  } catch (error: any) {
    console.error(pc.red(error.message || 'Login failed'));
    throw error;
  }
}


interface StoredTokens {
    access_token: string;
    refresh_token: string;
    expires_at: number; // Unix timestamp
  }


  async function refreshToken(): Promise<StoredTokens> { 
    const tokens = getTokens();
    if (!tokens) {
      throw new Error('No tokens found');
    }
    const newTokens = await pollForTokens({
      clientId: 'client_01K4Y8A5Q3FYGXD362BJQ6AGYD',
      deviceCode: tokens.refresh_token,
      expiresIn: 300,
      interval: 5,
    });
    saveTokens(newTokens);
    return newTokens as StoredTokens;
   }

