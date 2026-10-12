import { useMemo, useState } from 'react';
import { Card, Input, ColorPicker } from 'antd';
import { ToolHeader } from '../../components/ToolHeader';
import { toColorFormats } from './color';

export const ColorConverterTool = () => {
  const [input, setInput] = useState('#1677ff');
  const [color, setColor] = useState('#1677ff');
  const formats = useMemo(() => toColorFormats(input), [input]);

  return (
    <section className="tool-page">
      <ToolHeader title="颜色转换" description="在十六进制、RGB、HSL 和 CSS 名称之间转换颜色。" />
      <div className="tool-grid">
        <Card title="输入" className="tool-card">
          <ColorPicker
            value={color}
            onChange={(_, css) => {
              setColor(css);
              setInput(css);
            }}
            showText
          />
          <Input value={input} onChange={(event) => setInput(event.target.value)} style={{ marginTop: 12 }} />
        </Card>
        <Card title="输出" className="tool-card">
          {formats.ok ? (
            <div className="color-formats">
              <div><strong>HEX：</strong><span>{formats.value.hex}</span></div>
              <div><strong>RGB：</strong><span>{formats.value.rgb}</span></div>
              <div><strong>HSL：</strong><span>{formats.value.hsl}</span></div>
            </div>
          ) : (
            <div className="tool-help">{formats.error}</div>
          )}
        </Card>
      </div>
    </section>
  );
};
