import { useState } from 'react';
import { CodeOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Input } from 'antd';
import { ToolHeader } from '../../components/ToolHeader';
import type { JsonDiffLine } from './json';
import { diffJsonLines, formatJson } from './json';

const { TextArea } = Input;

export const JsonFormatterTool = () => {
  const [leftInput, setLeftInput] = useState('{\n  "name": "OneTool",\n  "version": 1\n}');
  const [rightInput, setRightInput] = useState('{\n  "name": "OneTool",\n  "version": 2\n}');
  const [errors, setErrors] = useState<string[]>([]);
  const [diff, setDiff] = useState<JsonDiffLine[]>([]);

  const handleInputChange = (side: 'left' | 'right', value: string): void => {
    if (side === 'left') {
      setLeftInput(value);
    } else {
      setRightInput(value);
    }
    setErrors([]);
    setDiff([]);
  };

  const handleFormat = (): void => {
    const leftResult = formatJson(leftInput);
    const rightResult = formatJson(rightInput);
    const nextErrors: string[] = [];

    if (leftResult.ok) {
      setLeftInput(leftResult.value);
    } else {
      nextErrors.push(`左侧 JSON: ${leftResult.error}`);
    }

    if (rightResult.ok) {
      setRightInput(rightResult.value);
    } else {
      nextErrors.push(`右侧 JSON: ${rightResult.error}`);
    }

    setErrors(nextErrors);

    if (leftResult.ok && rightResult.ok) {
      setDiff(diffJsonLines(leftResult.value, rightResult.value));
    } else {
      setDiff([]);
    }
  };

  return (
    <section className="tool-page">
      <ToolHeader title="JSON对比" description="格式化、校验并对比两个 JSON 字符串。" />
      {errors.length > 0 ? (
        <Alert
          message={errors.join('；')}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      ) : null}
      <div className="tool-grid">
        <Card title="JSON A" className="tool-card">
          <TextArea
            className="tool-textarea"
            value={leftInput}
            onChange={(event) => handleInputChange('left', event.target.value)}
            spellCheck={false}
          />
        </Card>
        <Card title="JSON B" className="tool-card">
          <TextArea
            className="tool-textarea"
            value={rightInput}
            onChange={(event) => handleInputChange('right', event.target.value)}
            spellCheck={false}
          />
        </Card>
      </div>
      <div className="tool-actions">
        <Button type="primary" icon={<CodeOutlined />} onClick={handleFormat}>
          格式化
        </Button>
      </div>
      <Card title="差异" className="json-diff-card">
        <div className="json-diff">
          <div className="json-diff-heading">JSON A</div>
          <div className="json-diff-heading">JSON B</div>
          {diff.map((line, index) => (
            <div className="json-diff-row" key={`${line.type}-${index}`}>
              <pre className={`json-diff-line json-diff-left json-diff-${line.type}`}>
                <span className="json-diff-number">{line.leftLineNumber ?? ''}</span>
                <code>{line.leftValue}</code>
              </pre>
              <pre className={`json-diff-line json-diff-right json-diff-${line.type}`}>
                <span className="json-diff-number">{line.rightLineNumber ?? ''}</span>
                <code>{line.rightValue}</code>
              </pre>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
};
