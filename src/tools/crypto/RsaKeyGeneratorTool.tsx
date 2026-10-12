import { useMemo, useState } from 'react';
import { Button, Card, Input, InputNumber, Select, Space, message } from 'antd';
import { ToolHeader } from '../../components/ToolHeader';
import { generateRsaKeyPair } from '../../cryptoApi';

const exponentOptions = [
  { value: 65537, label: '65537 - 常用标准值' },
  { value: 3, label: '3 - 旧系统兼容值' }
];

export const RsaKeyGeneratorTool = () => {
  const [modulusLength, setModulusLength] = useState(2048);
  const [publicExponent, setPublicExponent] = useState(65537);
  const [publicKey, setPublicKey] = useState('');
  const [privateKey, setPrivateKey] = useState('');

  const handleGenerate = async (): Promise<void> => {
    const result = await generateRsaKeyPair(modulusLength, publicExponent);
    setPublicKey(result.publicKey);
    setPrivateKey(result.privateKey);
  };

  const copy = async (value: string): Promise<void> => {
    await navigator.clipboard.writeText(value);
    void message.success('已复制');
  };

  const shortInfo = useMemo(() => `${modulusLength} bit`, [modulusLength]);

  return (
    <section className="tool-page">
      <ToolHeader title="RSA秘钥生成" description="生成 RSA 公钥和私钥。" />
      <Card title="参数" style={{ marginBottom: 16 }}>
        <Space wrap>
          <InputNumber
            min={1024}
            step={512}
            value={modulusLength}
            onChange={(value) => setModulusLength(value ?? 2048)}
          />
          <Select
            value={publicExponent}
            options={exponentOptions}
            onChange={setPublicExponent}
            style={{ width: 180 }}
          />
          <Button type="primary" onClick={handleGenerate}>
            生成
          </Button>
          <span>{shortInfo}</span>
        </Space>
        <div className="tool-help">
          公钥指数：RSA 里的公开参数，通常用 <code>65537</code>。<code>3</code> 是较少使用的兼容值。
        </div>
      </Card>
      <div className="tool-grid">
        <Card title="公钥" className="tool-card">
          <Input.TextArea className="tool-textarea" value={publicKey} readOnly spellCheck={false} />
          <div className="tool-actions">
            <Button disabled={!publicKey} onClick={() => void copy(publicKey)}>
              复制公钥
            </Button>
          </div>
        </Card>
        <Card title="私钥" className="tool-card">
          <Input.TextArea className="tool-textarea" value={privateKey} readOnly spellCheck={false} />
          <div className="tool-actions">
            <Button disabled={!privateKey} onClick={() => void copy(privateKey)}>
              复制私钥
            </Button>
          </div>
        </Card>
      </div>
    </section>
  );
};
