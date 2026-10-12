import { useState } from 'react';
import { Alert, Button, Card, Input, Select, Space } from 'antd';
import { ToolHeader } from '../../components/ToolHeader';
import { commonDateFormats, dateToTimestamp, timestampToDate } from './timestamp';

const customFormatValue = '__custom__';

const getInitialValues = () => {
  const timestamp = Date.now().toString();
  const date = timestampToDate(timestamp, commonDateFormats[0]);

  return {
    timestamp,
    date: date.ok ? date.value : ''
  };
};

export const TimestampConverterTool = () => {
  const initialValues = getInitialValues();
  const [selectedFormat, setSelectedFormat] = useState(commonDateFormats[0]);
  const [customFormat, setCustomFormat] = useState(commonDateFormats[0]);
  const [timestamp, setTimestamp] = useState(initialValues.timestamp);
  const [date, setDate] = useState(initialValues.date);
  const [error, setError] = useState('');
  const activeFormat = selectedFormat === customFormatValue ? customFormat : selectedFormat;

  const handleTimestampToDate = (): void => {
    const result = timestampToDate(timestamp, activeFormat);
    if (result.ok) {
      setDate(result.value);
      setError('');
    } else {
      setError(result.error);
    }
  };

  const handleDateToTimestamp = (): void => {
    const result = dateToTimestamp(date, activeFormat);
    if (result.ok) {
      setTimestamp(result.value);
      setError('');
    } else {
      setError(result.error);
    }
  };

  return (
    <section className="tool-page">
      <ToolHeader
        title="时间戳转换"
        description="Unix 时间戳与日期时间互转。"
      />
      {error ? <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} /> : null}
      <div className="timestamp-grid">
        <Card title="时间戳转日期">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Input
              value={timestamp}
              onChange={(event) => setTimestamp(event.target.value)}
              placeholder="秒或毫秒时间戳"
            />
            <Select
             style={{ width: '100%' }}
              value={selectedFormat}
              onChange={setSelectedFormat}
              options={[
                ...commonDateFormats.map((format) => ({ value: format, label: format })),
                { value: customFormatValue, label: '自定义格式' }
              ]}
            />
            {selectedFormat === customFormatValue ? (
              <Input
                value={customFormat}
                onChange={(event) => setCustomFormat(event.target.value)}
                placeholder="例如 yyyy-MM-dd HH:mm:ss"
              />
            ) : null}
            <Button type="primary" onClick={handleTimestampToDate}>
              转为日期
            </Button>
          </Space>
        </Card>
        <Card title="日期转时间戳">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Input
              value={date}
              onChange={(event) => setDate(event.target.value)}
              placeholder={activeFormat}
            />
            <Button type="primary" onClick={handleDateToTimestamp}>
              转为时间戳
            </Button>
          </Space>
        </Card>
      </div>
    </section>
  );
};
