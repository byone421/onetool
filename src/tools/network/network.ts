import type { Result } from '../../utils/result';

export interface Ipv4CidrInfo {
  cidr: string;
  ipAddress: string;
  prefixLength: number;
  subnetMask: string;
  wildcardMask: string;
  networkAddress: string;
  broadcastAddress: string;
  firstUsableAddress: string;
  lastUsableAddress: string;
  totalAddresses: string;
  usableAddresses: string;
}

const ipv4ToNumber = (ip: string): Result<number> => {
  const parts = ip.trim().split('.');
  if (parts.length !== 4) {
    return { ok: false, error: '请输入有效的 IPv4 地址' };
  }

  const bytes = parts.map((part) => Number(part));
  if (bytes.some((byte, index) => !/^\d+$/.test(parts[index]) || byte < 0 || byte > 255)) {
    return { ok: false, error: 'IPv4 每段必须是 0 到 255 的整数' };
  }

  return {
    ok: true,
    value:
      (((bytes[0] << 24) >>> 0) |
        (bytes[1] << 16) |
        (bytes[2] << 8) |
        bytes[3]) >>>
      0
  };
};

const numberToIpv4 = (value: number): string =>
  [24, 16, 8, 0].map((shift) => (value >>> shift) & 255).join('.');

const addressCount = (prefixLength: number): bigint => 1n << BigInt(32 - prefixLength);

const usableCount = (prefixLength: number): bigint => {
  if (prefixLength === 32) {
    return 1n;
  }
  if (prefixLength === 31) {
    return 2n;
  }
  return addressCount(prefixLength) - 2n;
};

export const calculateIpv4Cidr = (input: string): Result<Ipv4CidrInfo> => {
  const match = input.trim().match(/^([^/]+)\/(\d{1,2})$/);
  if (!match) {
    return { ok: false, error: '请输入 CIDR，格式例如 192.168.1.0/24' };
  }

  const ipResult = ipv4ToNumber(match[1]);
  if (!ipResult.ok) {
    return ipResult;
  }

  const prefixLength = Number(match[2]);
  if (prefixLength < 0 || prefixLength > 32) {
    return { ok: false, error: 'CIDR 前缀长度必须在 0 到 32 之间' };
  }

  const mask = prefixLength === 0 ? 0 : (0xffffffff << (32 - prefixLength)) >>> 0;
  const wildcard = (~mask) >>> 0;
  const network = ipResult.value & mask;
  const broadcast = network | wildcard;
  const firstUsable = prefixLength >= 31 ? network : network + 1;
  const lastUsable = prefixLength >= 31 ? broadcast : broadcast - 1;

  return {
    ok: true,
    value: {
      cidr: `${numberToIpv4(network)}/${prefixLength}`,
      ipAddress: numberToIpv4(ipResult.value),
      prefixLength,
      subnetMask: numberToIpv4(mask),
      wildcardMask: numberToIpv4(wildcard),
      networkAddress: numberToIpv4(network),
      broadcastAddress: numberToIpv4(broadcast),
      firstUsableAddress: numberToIpv4(firstUsable),
      lastUsableAddress: numberToIpv4(lastUsable),
      totalAddresses: addressCount(prefixLength).toString(),
      usableAddresses: usableCount(prefixLength).toString()
    }
  };
};
