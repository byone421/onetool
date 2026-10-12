import colorNames from 'color-name';
import type { Result } from '../../utils/result';

const cssNames = Object.fromEntries(
  Object.entries(colorNames).map(([name, rgb]) => [
    name,
    `#${rgb.map((value) => value.toString(16).padStart(2, '0')).join('')}`
  ])
) as Record<string, string>;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const toHex = (value: number) => value.toString(16).padStart(2, '0');

const parseHex = (input: string): Result<{ r: number; g: number; b: number }> => {
  const value = input.trim().replace(/^#/, '');
  if (![3, 6].includes(value.length) || !/^[0-9a-fA-F]+$/.test(value)) {
    return { ok: false, error: 'Invalid hex color' };
  }

  const normalized = value.length === 3 ? value.split('').map((ch) => ch + ch).join('') : value;
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);

  return { ok: true, value: { r, g, b } };
};

const parseRgb = (input: string): Result<{ r: number; g: number; b: number }> => {
  const match = input.trim().match(/^rgb\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
  if (!match) return { ok: false, error: 'Invalid rgb color' };
  return {
    ok: true,
    value: {
      r: clamp(Number(match[1]), 0, 255),
      g: clamp(Number(match[2]), 0, 255),
      b: clamp(Number(match[3]), 0, 255)
    }
  };
};

const parseHsl = (input: string): Result<{ r: number; g: number; b: number }> => {
  const match = input.trim().match(/^hsl\s*\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%\s*\)$/i);
  if (!match) return { ok: false, error: 'Invalid hsl color' };

  let h = ((Number(match[1]) % 360) + 360) % 360;
  const s = clamp(Number(match[2]) / 100, 0, 1);
  const l = clamp(Number(match[3]) / 100, 0, 1);

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  return {
    ok: true,
    value: {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255)
    }
  };
};

const rgbToHsl = (r: number, g: number, b: number): string => {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const lightness = (max + min) / 2;
  let hue = 0;
  let saturation = 0;

  if (delta !== 0) {
    saturation = delta / (1 - Math.abs(2 * lightness - 1));
    if (max === red) hue = 60 * (((green - blue) / delta) % 6);
    else if (max === green) hue = 60 * ((blue - red) / delta + 2);
    else hue = 60 * ((red - green) / delta + 4);
  }

  return `hsl(${Math.round((hue + 360) % 360)}, ${Math.round(saturation * 100)}%, ${Math.round(lightness * 100)}%)`;
};

export const parseColorInput = (input: string): Result<{ r: number; g: number; b: number }> => {
  const value = input.trim();
  if (value.startsWith('#')) return parseHex(value);
  if (/^rgb/i.test(value)) return parseRgb(value);
  if (/^hsl/i.test(value)) return parseHsl(value);
  const named = cssNames[value.toLowerCase()];
  if (named) return parseHex(named);
  return { ok: false, error: 'Unsupported color format' };
};

export const toColorFormats = (input: string): Result<{ hex: string; rgb: string; hsl: string; name: string }> => {
  const parsed = parseColorInput(input);
  if (!parsed.ok) return parsed;
  const { r, g, b } = parsed.value;
  const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  const entries = Object.entries(cssNames).find(([, value]) => value.toLowerCase() === hex.toLowerCase());

  return {
    ok: true,
    value: {
      hex,
      rgb: `rgb(${r}, ${g}, ${b})`,
      hsl: rgbToHsl(r, g, b),
      name: entries?.[0] ?? 'unknown'
    }
  };
};
