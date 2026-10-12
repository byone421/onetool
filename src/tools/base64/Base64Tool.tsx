import { useState } from 'react';
import { Alert, Button, Card, Input } from 'antd';
import { ToolHeader } from '../../components/ToolHeader';
import { decodeBase64, encodeBase64 } from './base64';

const { TextArea } = Input;

export const Base64Tool = () => {
  const [input, setInput] = useState('hello OneTool');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  const handleEncode = (): void => {
    setOutput(encodeBase64(input));
    setError('');
  };

  const handleDecode = (): void => {
    const result = decodeBase64(input);
    if (result.ok) {
      setOutput(result.value);
      setError('');
    } else {
      setOutput('');
      setError(result.error);
    }
  };

  return (
    <section className="tool-page">
      <ToolHeader
        title="BASE64"
        description="文本与 Base64 编码互转。"
      />
      {error ? <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} /> : null}
      <div className="tool-grid">
        <Card title="输入" className="tool-card">
          <TextArea
            className="tool-textarea"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            spellCheck={false}
          />
          <div className="tool-actions">
            <Button type="primary" onClick={handleEncode}>
              编码
            </Button>
            <Button onClick={handleDecode}>解码</Button>
          </div>
        </Card>
        <Card title="输出" className="tool-card">
          <pre className="tool-output">{output}</pre>
        </Card>
      </div>
    </section>
  );
};
