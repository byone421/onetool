import smCrypto from 'sm-crypto';

const { sm2, sm4 } = smCrypto;
type SymmetricAlgorithm = 'aes-256-cbc' | 'aes-128-cbc' | 'rc4' | 'sm4-cbc';

const bytes = (value: string) => new TextEncoder().encode(value);
const hex = (value: Uint8Array) => Array.from(value, (item) => item.toString(16).padStart(2, '0')).join('');
const unhex = (value: string) => Uint8Array.from(value.match(/.{2}/g) ?? [], (item) => Number.parseInt(item, 16));
const normalizeKey = (key: string, length: number) => bytes(key.padEnd(length, '\0').slice(0, length));

const rc4 = (key: Uint8Array, input: Uint8Array): Uint8Array => {
  const s = Array.from({ length: 256 }, (_, index) => index); let j = 0;
  for (let i = 0; i < 256; i += 1) { j = (j + s[i] + key[i % key.length]) & 255; [s[i], s[j]] = [s[j], s[i]]; }
  const output = new Uint8Array(input.length); let i = 0; j = 0;
  input.forEach((item, index) => { i = (i + 1) & 255; j = (j + s[i]) & 255; [s[i], s[j]] = [s[j], s[i]]; output[index] = item ^ s[(s[i] + s[j]) & 255]; });
  return output;
};

export const generateRsaKeyPair = async (modulusLength: number, publicExponent: number) => {
  const pair = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength, publicExponent: publicExponent === 3 ? new Uint8Array([3]) : new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  const [pub, priv] = await Promise.all([crypto.subtle.exportKey('spki', pair.publicKey), crypto.subtle.exportKey('pkcs8', pair.privateKey)]);
  const pem = (data: ArrayBuffer, label: string) => `-----BEGIN ${label}-----\n${btoa(String.fromCharCode(...new Uint8Array(data))).match(/.{1,64}/g)?.join('\n')}\n-----END ${label}-----`;
  return { publicKey: pem(pub, 'PUBLIC KEY'), privateKey: pem(priv, 'PRIVATE KEY') };
};

export const generateSm2KeyPair = () => { const keys = sm2.generateKeyPairHex(); return { publicKey: `-----BEGIN PUBLIC KEY-----\n${keys.publicKey}\n-----END PUBLIC KEY-----`, privateKey: `-----BEGIN PRIVATE KEY-----\n${keys.privateKey}\n-----END PRIVATE KEY-----` }; };

export const encryptText = async (algorithm: SymmetricAlgorithm, key: string, text: string) => {
  if (algorithm === 'sm4-cbc') { const iv = crypto.getRandomValues(new Uint8Array(16)); return { iv: hex(iv), cipherText: sm4.encrypt(text, key, { mode: 'cbc', iv: hex(iv), output: 'hex' }) }; }
  if (algorithm === 'rc4') return { iv: '', cipherText: hex(rc4(normalizeKey(key, 16), bytes(text))) };
  const iv = crypto.getRandomValues(new Uint8Array(16)); const length = algorithm === 'aes-256-cbc' ? 32 : 16;
  const cryptoKey = await crypto.subtle.importKey('raw', normalizeKey(key, length), { name: 'AES-CBC' }, false, ['encrypt']);
  return { iv: hex(iv), cipherText: hex(new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-CBC', iv }, cryptoKey, bytes(text)))) };
};

export const decryptText = async (algorithm: SymmetricAlgorithm, key: string, cipherText: string, iv = '') => {
  if (algorithm === 'sm4-cbc') return sm4.decrypt(cipherText, key, { mode: 'cbc', iv, input: 'hex', output: 'text' });
  if (algorithm === 'rc4') return new TextDecoder().decode(rc4(normalizeKey(key, 16), unhex(cipherText)));
  const length = algorithm === 'aes-256-cbc' ? 32 : 16; const cryptoKey = await crypto.subtle.importKey('raw', normalizeKey(key, length), { name: 'AES-CBC' }, false, ['decrypt']);
  return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-CBC', iv: unhex(iv) }, cryptoKey, unhex(cipherText)));
};
