import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Checkbox, Input, InputNumber, Radio, Space, Tabs, message } from 'antd';
import { ToolHeader } from '../../components/ToolHeader';
import {
  buildCronExpression,
  createDefaultCronFields,
  cronFieldConfigs,
  fieldToDescription,
  fieldToExpression,
  formatCronDate,
  getNextRunTimes,
  parseCronExpression,
  parseFieldState
} from './cron';
import type { CronFieldConfig, CronFieldKey, CronFieldMap, CronFieldMode, CronFieldState } from './cron';

const defaultFields = createDefaultCronFields();

const modeOptions = (config: CronFieldConfig) => [
  ...(config.allowNone ? [{ label: '不指定', value: 'none' }] : []),
  { label: `每${config.unit}`, value: 'every' },
  { label: '范围', value: 'range' },
  { label: '间隔', value: 'interval' },
  ...(config.key === 'week' ? [{ label: '第N周', value: 'nthWeek' }] : []),
  { label: '指定', value: 'specific' }
];

const valueOptions = (config: CronFieldConfig) =>
  Array.from({ length: config.max - config.min + 1 }, (_, index) => {
    const value = config.min + index;
    return { label: value.toString(), value };
  });

interface FieldEditorProps {
  config: CronFieldConfig;
  field: CronFieldState;
  onChange: (field: CronFieldState) => void;
}

const FieldEditor = ({ config, field, onChange }: FieldEditorProps) => {
  const update = (patch: Partial<CronFieldState>): void => onChange({ ...field, ...patch });

  return (
    <Card className="cron-editor-card">
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div className="cron-field-heading">
          <strong>{config.label}</strong>
          <span>支持通配符、范围、步进和指定值</span>
        </div>
        <Radio.Group
          className="cron-mode-group"
          value={field.mode}
          options={modeOptions(config)}
          onChange={(event) => update({ mode: event.target.value as CronFieldMode })}
        />
        {field.mode === 'range' ? (
          <Space wrap>
            <span>从</span>
            <InputNumber
              min={config.min}
              max={config.max}
              value={field.start}
              onChange={(value) => update({ start: value ?? config.min })}
            />
            <span>到</span>
            <InputNumber
              min={config.min}
              max={config.max}
              value={field.end}
              onChange={(value) => update({ end: value ?? config.max })}
            />
            <span>{config.unit}</span>
          </Space>
        ) : null}
        {field.mode === 'interval' ? (
          <Space wrap>
            <span>从</span>
            <InputNumber
              min={config.min}
              max={config.max}
              value={field.start}
              onChange={(value) => update({ start: value ?? config.min })}
            />
            <span>{config.unit}开始，每</span>
            <InputNumber
              min={1}
              max={Math.max(1, config.max - config.min)}
              value={field.step}
              onChange={(value) => update({ step: value ?? 1 })}
            />
            <span>{config.unit}执行一次</span>
          </Space>
        ) : null}
        {field.mode === 'specific' ? (
          <Checkbox.Group
            className="cron-checkbox-grid"
            options={valueOptions(config)}
            value={field.values}
            onChange={(values) => update({ values: values.map(Number) })}
          />
        ) : null}
        {config.key === 'week' && field.mode === 'nthWeek' ? (
          <Space wrap>
            <span>第</span>
            <InputNumber
              min={1}
              max={5}
              value={field.nth}
              onChange={(value) => update({ nth: value ?? 1 })}
            />
            <span>周的星期</span>
            <InputNumber
              min={config.min}
              max={config.max}
              value={field.weekday}
              onChange={(value) => update({ weekday: value ?? config.min })}
            />
          </Space>
        ) : null}
      </Space>
    </Card>
  );
};

export const CronGeneratorTool = () => {
  const [fields, setFields] = useState<CronFieldMap>(defaultFields);
  const generatedExpression = useMemo(() => buildCronExpression(fields), [fields]);
  const [expression, setExpression] = useState(generatedExpression);
  const [futureTimes, setFutureTimes] = useState<string[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    setExpression(generatedExpression);
  }, [generatedExpression]);

  const updateField = (key: CronFieldKey, field: CronFieldState): void => {
    setFields((current) => ({
      ...current,
      ...(key === 'day' && field.mode !== 'none' ? { week: { ...current.week, mode: 'none' } } : {}),
      ...(key === 'week' && field.mode !== 'none' ? { day: { ...current.day, mode: 'none' } } : {}),
      [key]: field
    }));
  };

  const copy = async (): Promise<void> => {
    await navigator.clipboard.writeText(expression);
    void message.success('已复制');
  };

  const preview = (): void => {
    const result = getNextRunTimes(expression, 10);
    if (result.ok) {
      setFutureTimes(result.value.map(formatCronDate));
      setError('');
    } else {
      setFutureTimes([]);
      setError(result.error);
    }
  };

  const parseToForm = (): void => {
    const parsed = parseCronExpression(expression);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }

    const parts = expression.trim().split(/\s+/);
    const nextFields = { ...defaultFields };
    cronFieldConfigs.forEach((config, index) => {
      nextFields[config.key] = parseFieldState(parts[index] ?? '?', config, nextFields[config.key]);
    });
    setFields(nextFields);
    setError('');
  };

  return (
    <section className="tool-page">
      <ToolHeader title="Cron 表达式生成器" description="生成 Quartz 风格 Cron 表达式并预览未来运行时间。" />
      {error ? <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} /> : null}
      <Tabs
        className="cron-tabs"
        items={cronFieldConfigs.map((config) => ({
          key: config.key,
          label: config.label,
          children: (
            <FieldEditor
              config={config}
              field={fields[config.key]}
              onChange={(field) => updateField(config.key, field)}
            />
          )
        }))}
      />

      <Card title="表达式字段" style={{ marginTop: 16 }}>
        <div className="cron-field-cards">
          {cronFieldConfigs.map((config) => (
            <div className="cron-field-card" key={config.key}>
              <strong>{config.label}</strong>
              <code>{config.key === 'year' && fieldToExpression(fields[config.key]) === '?' ? '' : fieldToExpression(fields[config.key])}</code>
              <span>{fieldToDescription(fields[config.key], config)}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Cron 表达式" style={{ marginTop: 16 }}>
        <Space wrap style={{ width: '100%' }}>
          <Input
            className="cron-expression-input"
            value={expression}
            onChange={(event) => setExpression(event.target.value)}
            spellCheck={false}
          />
          <Button onClick={parseToForm}>反解析到表单</Button>
          <Button type="primary" onClick={preview}>
            运行
          </Button>
          <Button onClick={() => void copy()}>复制</Button>
        </Space>
        <div className="tool-help">支持 6 位或 7 位表达式，如 * * * * * ? 或 0 0/5 * * * ?。</div>
      </Card>

      <Card title="未来 10 次运行时间" style={{ marginTop: 16 }}>
        {futureTimes.length > 0 ? (
          <pre className="tool-output text-diff-output">{futureTimes.join('\n')}</pre>
        ) : (
          <div className="tool-output text-diff-output">点击运行查看结果</div>
        )}
      </Card>
    </section>
  );
};
