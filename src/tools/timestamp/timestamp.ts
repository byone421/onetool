import type { Result } from '../../utils/result';

export const commonDateFormats = [
  'yyyy-MM-dd HH:mm:ss',
  'yyyy/MM/dd HH:mm:ss',
  'yyyy-MM-dd',
  'yyyy/MM/dd',
  'yyyyMMddHHmmss',
  'yyyyMMdd',
  'yyyy-MM-ddTHH:mm:ss'
];

const tokenPatterns: Record<string, string> = {
  yyyy: '(?<yyyy>\\d{4})',
  SSS: '(?<SSS>\\d{1,3})',
  MM: '(?<MM>\\d{1,2})',
  dd: '(?<dd>\\d{1,2})',
  HH: '(?<HH>\\d{1,2})',
  mm: '(?<mm>\\d{1,2})',
  ss: '(?<ss>\\d{1,2})'
};

const tokens = Object.keys(tokenPatterns).sort((a, b) => b.length - a.length);

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const pad = (value: number, length = 2): string => value.toString().padStart(length, '0');

const formatDate = (date: Date, format: string): string =>
  format
    .replaceAll("'", '')
    .replaceAll('yyyy', date.getFullYear().toString())
    .replaceAll('MM', pad(date.getMonth() + 1))
    .replaceAll('dd', pad(date.getDate()))
    .replaceAll('HH', pad(date.getHours()))
    .replaceAll('mm', pad(date.getMinutes()))
    .replaceAll('ss', pad(date.getSeconds()))
    .replaceAll('SSS', pad(date.getMilliseconds(), 3));

const buildFormatRegExp = (format: string): RegExp => {
  let pattern = '^';
  let inLiteral = false;

  for (let index = 0; index < format.length; ) {
    if (format[index] === "'") {
      inLiteral = !inLiteral;
      index += 1;
      continue;
    }

    const token = tokens.find((item) => format.startsWith(item, index));
    if (token && !inLiteral) {
      pattern += tokenPatterns[token];
      index += token.length;
    } else {
      pattern += escapeRegExp(format[index]);
      index += 1;
    }
  }

  return new RegExp(`${pattern}$`);
};

const parseFormattedDate = (input: string, format: string): Result<Date> => {
  const match = buildFormatRegExp(format).exec(input.trim());

  if (!match?.groups) {
    return {
      ok: false,
      error: 'Date does not match the selected format'
    };
  }

  const year = Number(match.groups.yyyy ?? new Date().getFullYear());
  const month = Number(match.groups.MM ?? 1);
  const day = Number(match.groups.dd ?? 1);
  const hour = Number(match.groups.HH ?? 0);
  const minute = Number(match.groups.mm ?? 0);
  const second = Number(match.groups.ss ?? 0);
  const millisecond = Number((match.groups.SSS ?? '0').padEnd(3, '0'));
  const date = new Date(year, month - 1, day, hour, minute, second, millisecond);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute ||
    date.getSeconds() !== second
  ) {
    return {
      ok: false,
      error: 'Invalid date'
    };
  }

  return {
    ok: true,
    value: date
  };
};

export const timestampToDate = (
  input: string,
  format = commonDateFormats[0]
): Result<string> => {
  const value = Number(input.trim());

  if (!Number.isFinite(value)) {
    return {
      ok: false,
      error: 'Timestamp must be a number'
    };
  }

  const milliseconds = Math.abs(value) < 1e12 ? value * 1000 : value;
  const date = new Date(milliseconds);

  if (Number.isNaN(date.getTime())) {
    return {
      ok: false,
      error: 'Invalid timestamp'
    };
  }

  return {
    ok: true,
    value: formatDate(date, format)
  };
};

export const dateToTimestamp = (
  input: string,
  format = commonDateFormats[0]
): Result<string> => {
  const parsed = parseFormattedDate(input, format);
  const date = parsed.ok ? parsed.value : new Date(input);

  if (Number.isNaN(date.getTime())) {
    return {
      ok: false,
      error: parsed.ok ? 'Invalid date' : parsed.error
    };
  }

  return {
    ok: true,
    value: Math.floor(date.getTime() / 1000).toString()
  };
};
