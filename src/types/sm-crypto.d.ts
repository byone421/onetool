declare module 'sm-crypto' {
  const value: {
    sm2: { generateKeyPairHex: () => { publicKey: string; privateKey: string } };
    sm4: {
      encrypt: (input: string, key: string, options: { mode: string; iv: string; output: string }) => string;
      decrypt: (input: string, key: string, options: { mode: string; iv: string; input: string; output: string }) => string;
    };
  };
  export default value;
}
