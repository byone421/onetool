import type { Result } from '../../utils/result';

export interface DecodedJwt {
  header: unknown;
  payload: unknown;
}

const decodeBase64Url = (input: string): string => {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

export const decodeJwt = (token: string): Result<DecodedJwt> => {
  const [headerPart, payloadPart] = token.trim().split('.');

  if (!headerPart || !payloadPart) {
    return {
      ok: false,
      error: 'JWT must contain header and payload'
    };
  }

  try {
    return {
      ok: true,
      value: {
        header: JSON.parse(decodeBase64Url(headerPart)),
        payload: JSON.parse(decodeBase64Url(payloadPart))
      }
    };
  } catch {
    return {
      ok: false,
      error: 'Invalid JWT token'
    };
  }
};
