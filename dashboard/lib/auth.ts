/**
 * Google service account JWT auth for React Native.
 *
 * Signs a JWT with the service account private key (RSA-SHA256 via node-forge),
 * exchanges it for a short-lived Google access token, and caches it until
 * 60 seconds before expiry to avoid unnecessary round-trips.
 */

import forge from 'node-forge';

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

const SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

let cache: { token: string; expiresAt: number } | null = null;

/** Encode a UTF-8 string as base64url (no padding). */
function base64url(input: string): string {
  return btoa(unescape(encodeURIComponent(input)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/** Encode raw binary bytes (forge binary string) as base64url. */
function binaryToBase64url(binary: string): string {
  return forge.util
    .encode64(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export async function getAccessToken(serviceAccount: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  // Return cached token if still valid (60-second buffer before expiry)
  if (cache && cache.expiresAt > now + 60) {
    return cache.token;
  }

  // Build JWT header + payload
  const header  = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }));

  const signingInput = `${header}.${payload}`;

  // Sign with RSA-SHA256 using the service account private key
  const privateKey = forge.pki.privateKeyFromPem(serviceAccount.private_key);
  const md = forge.md.sha256.create();
  md.update(signingInput, 'utf8');
  const signature = binaryToBase64url(privateKey.sign(md));

  const jwt = `${signingInput}.${signature}`;

  // Exchange the signed JWT for a Google access token
  const resp = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:
      'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer' +
      `&assertion=${jwt}`,
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Failed to get access token (${resp.status}): ${body}`);
  }

  const { access_token } = await resp.json();
  cache = { token: access_token, expiresAt: now + 3600 };
  return access_token;
}
