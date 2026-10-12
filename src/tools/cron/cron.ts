import type { Result } from '../../utils/result';

export type CronFieldKey = 'second' | 'minute' | 'hour' | 'day' | 'month' | 'week' | 'year';
export type CronFieldMode = 'none' | 'every' | 'range' | 'interval' | 'specific' | 'nthWeek';

export interface CronFieldConfig {
  key: CronFieldKey;
  label: string;
  unit: string;
  min: number;
  max: number;
  allowNone?: boolean;
}

export interface CronFieldState {
  mode: CronFieldMode;
  start: number;
  end: number;
  step: number;
  values: number[];
  nth: number;
  weekday: number;
}

export const cronFieldConfigs: CronFieldConfig[] = [
  { key: 'second', label: '秒', unit: '秒', min: 0, max: 59 },
  { key: 'minute', label: '分钟', unit: '分', min: 0, max: 59 },
  { key: 'hour', label: '小时', unit: '时', min: 0, max: 23 },
  { key: 'day', label: '日', unit: '日', min: 1, max: 31, allowNone: true },
  { key: 'month', label: '月', unit: '月', min: 1, max: 12 },
  { key: 'week', label: '周', unit: '周', min: 1, max: 7, allowNone: true },
  { key: 'year', label: '年', unit: '年', min: new Date().getFullYear(), max: 2099, allowNone: true }
];

export type CronFieldMap = Record<CronFieldKey, CronFieldState>;

export const createDefaultCronFields = (): CronFieldMap => ({
  second: { mode: 'every', start: 0, end: 59, step: 1, values: [], nth: 1, weekday: 1 },
  minute: { mode: 'every', start: 0, end: 59, step: 1, values: [], nth: 1, weekday: 1 },
  hour: { mode: 'every', start: 0, end: 23, step: 1, values: [], nth: 1, weekday: 1 },
  day: { mode: 'every', start: 1, end: 31, step: 1, values: [], nth: 1, weekday: 1 },
  month: { mode: 'every', start: 1, end: 12, step: 1, values: [], nth: 1, weekday: 1 },
  week: { mode: 'none', start: 1, end: 7, step: 1, values: [], nth: 2, weekday: 3 },
  year: { mode: 'none', start: new Date().getFullYear(), end: 2099, step: 1, values: [], nth: 1, weekday: 1 }
});

export const fieldToExpression = (field: CronFieldState): string => {
  if (field.mode === 'none') {
    return '?';
  }
  if (field.mode === 'every') {
    return '*';
  }
  if (field.mode === 'range') {
    return `${field.start}-${field.end}`;
  }
  if (field.mode === 'interval') {
    return `${field.start}/${field.step}`;
  }
  if (field.mode === 'nthWeek') {
    return `${field.weekday}#${field.nth}`;
  }
  return field.values.length > 0 ? [...field.values].sort((a, b) => a - b).join(',') : '*';
};

export const fieldToDescription = (field: CronFieldState, config: CronFieldConfig): string => {
  if (field.mode === 'none') {
    return '不指定';
  }
  if (field.mode === 'every') {
    return `每${config.unit}`;
  }
  if (field.mode === 'range') {
    return `${field.start}-${field.end}${config.unit}`;
  }
  if (field.mode === 'interval') {
    return `从 ${field.start}${config.unit} 开始，每 ${field.step}${config.unit}`;
  }
  if (field.mode === 'nthWeek') {
    return `第${field.nth}周的星期${field.weekday}`;
  }
  return field.values.length > 0 ? field.values.join(', ') : `每${config.unit}`;
};

export const buildCronExpression = (fields: CronFieldMap): string => {
  const parts = cronFieldConfigs.map((config) => {
    const value = fieldToExpression(fields[config.key]);
    return config.key === 'year' && value === '?' ? '' : value;
  });

  return parts.filter(Boolean).join(' ');
};

interface ParsedCron {
  seconds: Set<number>;
  minutes: Set<number>;
  hours: Set<number>;
  days: Set<number> | null;
  months: Set<number>;
  weeks: Set<number> | null;
  nthWeek: { weekday: number; nth: number } | null;
  years: Set<number> | null;
}

const toRange = (min: number, max: number): number[] =>
  Array.from({ length: max - min + 1 }, (_, index) => min + index);

const parseField = (
  part: string,
  min: number,
  max: number,
  allowQuestion = false
): Result<Set<number> | null> => {
  const value = part.trim();
  if (allowQuestion && value === '?') {
    return { ok: true, value: null };
  }
  if (value === '*') {
    return { ok: true, value: new Set(toRange(min, max)) };
  }

  const output = new Set<number>();
  for (const token of value.split(',')) {
    const [rangeToken, stepToken] = token.split('/');
    const step = stepToken ? Number(stepToken) : 1;
    if (!Number.isInteger(step) || step < 1) {
      return { ok: false, error: `无效步长：${token}` };
    }

    const rangeParts = rangeToken.split('-');
    const start = rangeToken === '*' ? min : Number(rangeParts[0]);
    const end = rangeToken === '*' || (rangeParts.length === 1 && stepToken) ? max : rangeParts.length === 2 ? Number(rangeParts[1]) : start;
    if (
      rangeParts.length > 2 ||
      !Number.isInteger(start) ||
      !Number.isInteger(end) ||
      start < min ||
      end > max ||
      start > end
    ) {
      return { ok: false, error: `无效字段：${token}` };
    }

    for (let value = start; value <= end; value += step) {
      output.add(value);
    }
  }

  return output.size > 0 ? { ok: true, value: output } : { ok: false, error: '表达式字段为空' };
};

const parseWeekField = (part: string): Result<{ weeks: Set<number> | null; nthWeek: ParsedCron['nthWeek'] }> => {
  const nthWeekMatch = part.match(/^([1-7])#([1-5])$/);
  if (nthWeekMatch) {
    return {
      ok: true,
      value: {
        weeks: null,
        nthWeek: { weekday: Number(nthWeekMatch[1]), nth: Number(nthWeekMatch[2]) }
      }
    };
  }

  const weeks = parseField(part, 1, 7, true);
  return weeks.ok
    ? { ok: true, value: { weeks: weeks.value, nthWeek: null } }
    : weeks;
};

export const parseCronExpression = (expression: string): Result<ParsedCron> => {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 6 && parts.length !== 7) {
    return { ok: false, error: '请输入 6 位或 7 位 Cron 表达式' };
  }

  const seconds = parseField(parts[0], 0, 59);
  if (!seconds.ok || !seconds.value) return seconds.ok ? { ok: false, error: '秒字段不能为空' } : seconds;
  const minutes = parseField(parts[1], 0, 59);
  if (!minutes.ok || !minutes.value) return minutes.ok ? { ok: false, error: '分钟字段不能为空' } : minutes;
  const hours = parseField(parts[2], 0, 23);
  if (!hours.ok || !hours.value) return hours.ok ? { ok: false, error: '小时字段不能为空' } : hours;
  const days = parseField(parts[3], 1, 31, true);
  if (!days.ok) return days;
  const months = parseField(parts[4], 1, 12);
  if (!months.ok || !months.value) return months.ok ? { ok: false, error: '月字段不能为空' } : months;
  const weeks = parseWeekField(parts[5]);
  if (!weeks.ok) return weeks;
  const years = parts[6]
    ? parseField(parts[6], new Date().getFullYear(), 2099, true)
    : ({ ok: true, value: null } as const);
  if (!years.ok) return years;

  return {
    ok: true,
    value: {
      seconds: seconds.value,
      minutes: minutes.value,
      hours: hours.value,
      days: days.value,
      months: months.value,
      weeks: weeks.value.weeks,
      nthWeek: weeks.value.nthWeek,
      years: years.value
    }
  };
};

const sorted = (values: Set<number>): number[] => [...values].sort((a, b) => a - b);

const sameOrAfterStart = (candidate: Date, start: Date): boolean => candidate.getTime() >= start.getTime();

const matchesDay = (date: Date, cron: ParsedCron): boolean => {
  const day = date.getDate();
  const week = date.getDay() + 1;
  if (cron.nthWeek) {
    return week === cron.nthWeek.weekday && Math.ceil(day / 7) === cron.nthWeek.nth;
  }
  const dayMatches = cron.days?.has(day) ?? true;
  const weekMatches = cron.weeks?.has(week) ?? true;
  return dayMatches && weekMatches;
};

export const getNextRunTimes = (expression: string, count = 10): Result<Date[]> => {
  const parsed = parseCronExpression(expression);
  if (!parsed.ok) {
    return parsed;
  }

  const cron = parsed.value;
  const now = new Date();
  const start = new Date(now.getTime() + 1000);
  start.setMilliseconds(0);

  const results: Date[] = [];
  const seconds = sorted(cron.seconds);
  const minutes = sorted(cron.minutes);
  const hours = sorted(cron.hours);
  const day = new Date(start.getFullYear(), start.getMonth(), start.getDate());

  for (let checkedDays = 0; checkedDays < 3650 && results.length < count; checkedDays += 1) {
    const year = day.getFullYear();
    if (
      (!cron.years || cron.years.has(year)) &&
      cron.months.has(day.getMonth() + 1) &&
      matchesDay(day, cron)
    ) {
      for (const hour of hours) {
        for (const minute of minutes) {
          for (const second of seconds) {
            const candidate = new Date(year, day.getMonth(), day.getDate(), hour, minute, second);
            if (sameOrAfterStart(candidate, start)) {
              results.push(candidate);
              if (results.length === count) {
                return { ok: true, value: results };
              }
            }
          }
        }
      }
    }
    day.setDate(day.getDate() + 1);
  }

  return results.length > 0
    ? { ok: true, value: results }
    : { ok: false, error: '未来 10 年内没有匹配的运行时间' };
};

export const parseFieldState = (
  expression: string,
  config: CronFieldConfig,
  fallback: CronFieldState
): CronFieldState => {
  if (config.allowNone && expression === '?') {
    return { ...fallback, mode: 'none' };
  }
  if (expression === '*') {
    return { ...fallback, mode: 'every' };
  }
  if (expression.includes('/')) {
    const [start, step] = expression.split('/').map(Number);
    if (Number.isInteger(start) && Number.isInteger(step)) {
      return { ...fallback, mode: 'interval', start, step };
    }
  }
  if (config.key === 'week' && expression.includes('#')) {
    const [weekday, nth] = expression.split('#').map(Number);
    if (Number.isInteger(weekday) && Number.isInteger(nth)) {
      return { ...fallback, mode: 'nthWeek', weekday, nth };
    }
  }
  if (expression.includes('-')) {
    const [start, end] = expression.split('-').map(Number);
    if (Number.isInteger(start) && Number.isInteger(end)) {
      return { ...fallback, mode: 'range', start, end };
    }
  }

  const values = expression.split(',').map(Number);
  if (values.every(Number.isInteger)) {
    return { ...fallback, mode: 'specific', values };
  }

  return fallback;
};

const pad = (value: number): string => value.toString().padStart(2, '0');

export const formatCronDate = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
