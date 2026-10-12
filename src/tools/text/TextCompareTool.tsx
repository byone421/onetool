import { useMemo, useState } from 'react';
import { Card, Input } from 'antd';
import { ToolHeader } from '../../components/ToolHeader';
import { diffText } from './text';

const { TextArea } = Input;

export const TextCompareTool = () => {
  const [left, setLeft] = useState('OneTool\n文本对比');
  const [right, setRight] = useState('OneTool\n文本差异对比');
  const diff = useMemo(() => diffText(left, right), [left, right]);

  return (
    <section className="tool-page">
      <ToolHeader title="文本对比" description="比较两个文本并查看差异。" />
      <div className="tool-grid">
        <Card title="原文本" className="tool-card">
          <TextArea
            className="tool-textarea"
            value={left}
            onChange={(event) => setLeft(event.target.value)}
            spellCheck={false}
          />
        </Card>
        <Card title="新文本" className="tool-card">
          <TextArea
            className="tool-textarea"
            value={right}
            onChange={(event) => setRight(event.target.value)}
            spellCheck={false}
          />
        </Card>
      </div>
      <Card title="差异" style={{ marginTop: 16 }}>
        <pre className="tool-output text-diff-output">
          {diff.map((part, index) => (
            <span className={`text-diff-${part.type}`} key={`${part.type}-${index}`}>
              {part.value}
            </span>
          ))}
        </pre>
      </Card>
    </section>
  );
};
