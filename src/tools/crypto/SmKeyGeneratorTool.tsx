import { useState } from 'react';
import { Button, Card, Input, message } from 'antd';
import { ToolHeader } from '../../components/ToolHeader';
import { generateSm2KeyPair } from '../../cryptoApi';

export const SmKeyGeneratorTool = () => {
  const [publicKey, setPublicKey] = useState('');
  const [privateKey, setPrivateKey] = useState('');

  const handleGenerate = (): void => {
    const result = generateSm2KeyPair();
    setPublicKey(result.publicKey);
    setPrivateKey(result.privateKey);
  };

  const copy = async (value: string): Promise<void> => {
    await navigator.clipboard.writeText(value);
    void message.success('已复制');
  };

  return (
    <section className="tool-page">
      <ToolHeader title="国密秘钥生成" description="生成 SM2 公钥和私钥。" />
      <Card title="操作" style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={handleGenerate}>
          生成
        </Button>
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
