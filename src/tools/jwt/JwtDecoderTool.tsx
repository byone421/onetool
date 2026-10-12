import { useState } from 'react';
import { Alert, Button, Card, Input } from 'antd';
import { ToolHeader } from '../../components/ToolHeader';
import { decodeJwt } from './jwt';

const { TextArea } = Input;

const sampleToken =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0b29scyIsImlhdCI6MTcwMDAwMDAwMH0.signature';

export const JwtDecoderTool = () => {
  const [input, setInput] = useState(sampleToken);
  const [header, setHeader] = useState('');
  const [payload, setPayload] = useState('');
  const [error, setError] = useState('');

  const handleDecode = (): void => {
    const result = decodeJwt(input);
    if (result.ok) {
      setHeader(JSON.stringify(result.value.header, null, 2));
      setPayload(JSON.stringify(result.value.payload, null, 2));
      setError('');
    } else {
      setHeader('');
      setPayload('');
      setError(result.error);
    }
  };

  return (
    <section className="tool-page">
      <ToolHeader
        title="JWT"
        description="解析 JWT Header 与 Payload，不校验签名。"
      />
      {error ? <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} /> : null}
      <Card title="Token" style={{ marginBottom: 16 }}>
        <TextArea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          autoSize={{ minRows: 4 }}
          spellCheck={false}
        />
        <div className="tool-actions">
          <Button type="primary" onClick={handleDecode}>
            解析
          </Button>
        </div>
      </Card>
      <div className="tool-grid">
        <Card title="Header" className="tool-card">
          <pre className="tool-output">{header}</pre>
        </Card>
        <Card title="Payload" className="tool-card">
          <pre className="tool-output">{payload}</pre>
        </Card>
      </div>
    </section>
  );
};
