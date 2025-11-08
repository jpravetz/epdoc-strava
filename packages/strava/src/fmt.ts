import type { Seconds } from '@epdoc/duration';
import { type Integer, pad } from '@epdoc/type';

// export type Dict = Record<string, unknown>;

// export function compare<T extends Dict>(a: T, b: T, key: string): number {
//   const aVal = a[key];
//   const bVal = b[key];
//   if (typeof aVal === 'string' && typeof bVal === 'string') {
//     return aVal.localeCompare(bVal);
//   }
//   if (typeof aVal === 'number' && typeof bVal === 'number') {
//     return aVal - bVal;
//   }
//   return 0;
// }

export type formatHMSOpts = {
  seconds?: boolean;
};

// export function formatMS(s: Seconds): string {
//   const seconds = s % 60;
//   const minutes = Math.floor(s / 60);
//   let result = minutes + ':';
//   result += pad(seconds, 2);
//   return result;
// }

// export function julianDate(d: Date): number {
//   return Math.floor(d.getTime() / 86400000 - d.getTimezoneOffset() / 1440 + 2440587.5) + 1;
// }

// export function fieldCapitalize(name: string): string {
//   return name
//     .replace(/^([a-z])/, function ($1: string) {
//       return $1.toUpperCase();
//     })
//     .replace(/(\_[a-z])/g, function ($1: string) {
//       return $1.toUpperCase().replace('_', ' ');
//     });
// }

export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
export class Fmt {
  static precision(num: number, precision: Integer, unit: string): string {
    return String(Math.round(num * precision) / precision) + unit;
  }
  static getDistanceString(value: number, imperial: boolean = false): string {
    if (imperial) {
      return Fmt.precision(value / 1609.344, 100, ' miles');
    } else {
      return Fmt.precision(value / 1000, 100, ' km');
    }
  }

  static getElevationString(value: number, imperial: boolean = false): string {
    if (imperial) {
      return Fmt.precision(value / 0.3048, 1, ' ft');
    } else {
      return Fmt.precision(value, 1, ' m');
    }
  }

  static getTemperatureString(value: number, imperial: boolean = false): string {
    if (imperial) {
      return Fmt.precision((value * 9) / 5 + 32, 1, '&deg;F');
    } else {
      return value + '&deg;C';
    }
  }

  static hms(s: Seconds, options?: formatHMSOpts): string {
    options || (options = {});
    const seconds = s % 60;
    const minutes = Math.floor(s / 60) % 60;
    const hours = Math.floor(s / (60 * 60));
    let result = pad(hours, 2) + ':';
    result += pad(minutes, 2);
    if (options.seconds !== false) {
      result += ':' + pad(seconds, 2);
    }
    return result;
  }
}
