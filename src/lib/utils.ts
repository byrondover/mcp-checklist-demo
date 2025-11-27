import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import Color from 'colorjs.io'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export enum WorkStyle {
  INDEPENDENT = 'INDEPENDENT',
  COLLABORATIVE = 'COLLABORATIVE',
}

// Helper to validate hex color format
const isValidHexFormat = (hex: string): boolean => {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex)
}

// Determine text color (black or white) based on background color luminance
export const getTextColorByLuminance = (backgroundColor: string) => {
  if (!isValidHexFormat(backgroundColor)) {
    return '#000000'
  }

  try {
    const color = new Color(backgroundColor)
    const luminance = color.luminance

    return luminance > 0.5 ? '#000000' : '#ffffff'
  } catch {
    return '#000000'
  }
}

/**
 * convert hex color string to google docs api RgbColor object
 * @param hex The hex string
 * @returns An RgbColor object
 */
export const hexToDocsRgbColor = (hex: string): gapi.client.docs.RgbColor => {
  let cleanHex = hex.startsWith('#') ? hex.slice(1).toUpperCase() : hex.toUpperCase();

  if (cleanHex.length === 3) {
    cleanHex = cleanHex[0] + cleanHex[0] + cleanHex[1] + cleanHex[1] + cleanHex[2] + cleanHex[2];
  }

  if (!/^[0-9A-F]{6}$/.test(cleanHex)) {
    console.error(`Invalid hex color: ${hex}. Returning black.`);
    return { red: 0, green: 0, blue: 0 };
  }

  const r255 = parseInt(cleanHex.slice(0, 2), 16);
  const g255 = parseInt(cleanHex.slice(2, 4), 16);
  const b255 = parseInt(cleanHex.slice(4, 6), 16);

  const rFloat = r255 / 255.0;
  const gFloat = g255 / 255.0;
  const bFloat = b255 / 255.0;

  return {
    red: rFloat,
    green: gFloat,
    blue: bFloat,
  };
}
