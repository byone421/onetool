import { useMemo, useState } from 'react';
import { Alert, Button, Card, Input, Select, Space } from 'antd';
import { ToolHeader } from '../../components/ToolHeader';
import { decryptText, encryptText } from '../../cryptoApi';

const { TextArea } = Input;

const algorithms = [
  { value: 'aes-256-cbc', label: 'AES-256-CBC' },
  { value: 'aes-128-cbc', label: 'AES-128-CBC' },
  { value: 'sm4-cbc', label: 'SM4-CBC' },
  { value: 'rc4', label: 'RC4' }
] as const;

const algorithmHelp: Record<string, string> = {
  'aes-256-cbc': 'AES-256，密钥长度建议 32 字节。',
  'aes-128-cbc': 'AES-128，密钥长度建议 16 字节。',
  'sm4-cbc': '国密 SM4，CBC 模式。',
  rc4: 'RC4 是旧算法，只做兼容。'
};

export const SymmetricCryptoTool = () => {
  const [algorithm, setAlgorithm] = useState<(typeof algorithms)[number]['value']>('aes-256-cbc');
  const [key, setKey] = useState('onetool-secret-key-123456789012');
  const [plainText, setPlainText] = useState('Hello OneTool');
  const [iv, setIv] = useState('');
  const [cipherText, setCipherText] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  const help = useMemo(() => algorithmHelp[algorithm], [algorithm]);

  const handleEncrypt = async (): Promise<void> => {
    try {
      const result = await encryptText(algorithm, key, plainText);
      setIv(result.iv);
      setCipherText(result.cipherText);
      setOutput(result.cipherText);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '加密失败');
    }
  };

  const handleDecrypt = async (): Promise<void> => {
    try {
      const result = await decryptText(algorithm, key, cipherText, iv);
      setOutput(result);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '解密失败');
    }
  };

  return (
    <section className="tool-page">
      <ToolHeader title="对称加密" description="使用 AES、SM4 或 RC4 加密和解密文本。" />
      {error ? <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} /> : null}
      <Card title="参数" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Select
            value={algorithm}
            options={algorithms as unknown as Array<{ value: string; label: string }>}
            onChange={setAlgorithm}
          />
          <div className="tool-help">{help}</div>
          <Input value={key} onChange={(event) => setKey(event.target.value)} placeholder="密钥" />
          <div className="tool-help">CBC 模式需要 IV；加密后会自动生成，解密时请把同一个 IV 填回来。RC4 不使用 IV。</div>
        </Space>
      </Card>
      <div className="tool-grid">
        <Card title="明文" className="tool-card">
          <TextArea
            className="tool-textarea"
            value={plainText}
            onChange={(event) => setPlainText(event.target.value)}
            spellCheck={false}
          />
          <div className="tool-actions">
            <Button type="primary" onClick={handleEncrypt}>
              加密
            </Button>
          </div>
        </Card>
        <Card title="密文" className="tool-card">
          <TextArea
            className="tool-textarea"
            value={cipherText}
            onChange={(event) => setCipherText(event.target.value)}
            spellCheck={false}
          />
          <Input
            value={iv}
            onChange={(event) => setIv(event.target.value)}
            placeholder="IV（CBC 模式时使用）"
            style={{ marginTop: 12 }}
          />
          <div className="tool-actions">
            <Button onClick={handleDecrypt}>解密</Button>
          </div>
        </Card>
      </div>
      <Card title="结果" style={{ marginTop: 16 }}>
        <pre className="tool-output">{output}</pre>
      </Card>
    </section>
  );
};
