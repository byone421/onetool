import type { Result } from '../../utils/result';

const toBinary = (text: string): string =>
  String.fromCharCode(...new TextEncoder().encode(text));

const fromBinary = (binary: string): string => {
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

export const encodeBase64 = (input: string): string => btoa(toBinary(input));

export const decodeBase64 = (input: string): Result<string> => {
  try {
    return {
      ok: true,
      value: fromBinary(atob(input.trim()))
    };
  } catch {
    return {
      ok: false,
      error: 'Invalid Base64 input'
    };
  }
};
