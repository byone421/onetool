import { useState } from 'react';
import { Alert, Button, Card, Input, Select } from 'antd';
import type { SqlLanguage } from 'sql-formatter';
import { ToolHeader } from '../../components/ToolHeader';
import { formatSql, sqlDialects } from './sql';

const { TextArea } = Input;

export const SqlFormatterTool = () => {
  const [dialect, setDialect] = useState<SqlLanguage>('sql');
  const [input, setInput] = useState(
    'select id,name,created_at from users where created_at >= ${startDat} and status = 1 order by created_at desc;'
  );
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  const handleFormat = (): void => {
    const result = formatSql(input, dialect);
    if (result.ok) {
      setOutput(result.value);
      setError('');
    } else {
      setError(result.error);
      setOutput('');
    }
  };

  return (
    <section className="tool-page">
      <ToolHeader
        title="SQL格式化"
        description="格式化主流关系型数据库 SQL，支持模板变量和非严格语法。"
      />
      {error ? <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} /> : null}
      <div className="tool-grid">
        <Card title="输入" className="tool-card">
          <Select
            value={dialect}
            options={sqlDialects}
            onChange={setDialect}
            style={{ width: 220, marginBottom: 12 }}
          />
          <TextArea
            className="tool-textarea"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            spellCheck={false}
          />
          <div className="tool-actions">
            <Button type="primary" onClick={handleFormat}>
              格式化
            </Button>
          </div>
        </Card>
        <Card title="输出" className="tool-card">
          <pre className="tool-output">{output}</pre>
        </Card>
      </div>
    </section>
  );
};
