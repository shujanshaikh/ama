export async function validateAuthToken(token: string): Promise<boolean> {
    try {
      const response = await fetch(
        'https://api.workos.com/user_management/authorize/device',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${token}`,
          },
          body: new URLSearchParams({
            client_id: process.env.WORKOS_CLIENT_ID!,
          }),
        },
      );
  
      if (!response.ok) {
        return false;
      }
  
      await response.json();
      return true;
    } catch (error) {
      console.error('Error validating access token:', error);
      return false;
    }
  }

