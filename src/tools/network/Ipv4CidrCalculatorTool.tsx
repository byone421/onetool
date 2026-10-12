import { useMemo, useState } from 'react';
import { Alert, Card, Descriptions, Input } from 'antd';
import { ToolHeader } from '../../components/ToolHeader';
import { calculateIpv4Cidr } from './network';

const getDefaultCidr = () => '192.168.1.0/24';

export const Ipv4CidrCalculatorTool = () => {
  const [input, setInput] = useState(getDefaultCidr);
  const result = useMemo(() => calculateIpv4Cidr(input), [input]);

  return (
    <section className="tool-page">
      <ToolHeader title="IPv4 子网计算器" description="解析 IPv4 CIDR 块并计算子网信息。" />
      <Card title="CIDR" style={{ marginBottom: 16 }}>
        <Input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="例如 192.168.1.0/24"
          spellCheck={false}
        />
      </Card>
      {!result.ok ? (
        <Alert message={result.error} type="error" showIcon />
      ) : (
        <Card title="子网信息">
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="CIDR">{result.value.cidr}</Descriptions.Item>
            <Descriptions.Item label="输入 IP">{result.value.ipAddress}</Descriptions.Item>
            <Descriptions.Item label="前缀长度">/{result.value.prefixLength}</Descriptions.Item>
            <Descriptions.Item label="子网掩码">{result.value.subnetMask}</Descriptions.Item>
            <Descriptions.Item label="通配符掩码">{result.value.wildcardMask}</Descriptions.Item>
            <Descriptions.Item label="网络地址">{result.value.networkAddress}</Descriptions.Item>
            <Descriptions.Item label="广播地址">{result.value.broadcastAddress}</Descriptions.Item>
            <Descriptions.Item label="首个可用地址">
              {result.value.firstUsableAddress}
            </Descriptions.Item>
            <Descriptions.Item label="最后可用地址">
              {result.value.lastUsableAddress}
            </Descriptions.Item>
            <Descriptions.Item label="地址总数">{result.value.totalAddresses}</Descriptions.Item>
            <Descriptions.Item label="可用地址数">
              {result.value.usableAddresses}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}
    </section>
  );
};
