import { useMemo, useState } from 'react';
import { Card, Checkbox, Input } from 'antd';
import { ToolHeader } from '../../components/ToolHeader';
import { compressText } from './text';

const { TextArea } = Input;

export const TextCompressTool = () => {
  const [input, setInput] = useState('第一行文本\n第二行文本\n第三行文本');
  const [removeInnerSpaces, setRemoveInnerSpaces] = useState(false);
  const output = useMemo(() => compressText(input, removeInnerSpaces), [input, removeInnerSpaces]);

  return (
    <section className="tool-page">
      <ToolHeader title="文本压缩" description="将多行文本压缩成一行。" />
      <div className="tool-grid">
        <Card title="输入" className="tool-card">
          <TextArea
            className="tool-textarea"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            spellCheck={false}
          />
          <div className="tool-actions">
            <Checkbox
              checked={removeInnerSpaces}
              onChange={(event) => setRemoveInnerSpaces(event.target.checked)}
            >
              去除文本中间的空格
            </Checkbox>
          </div>
        </Card>
        <Card title="输出" className="tool-card">
          <pre className="tool-output">{output}</pre>
        </Card>
      </div>
    </section>
  );
};
