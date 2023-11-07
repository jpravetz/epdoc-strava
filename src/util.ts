import fs from 'fs';
import { LogFunctions } from './types';

export function readJson(path: string): Promise<any> {
  return new Promise((resolve, reject) => {
    fs.readFile(path, 'utf8', (err, data) => {
      if (err) {
        reject(err);
      } else {
        try {
          let json = JSON.parse(data.toString());
          resolve(json);
        } catch (error) {
          reject(error);
        }
      }
    });
  });
}

export function writeJson(path: string, data): Promise<void> {
  return new Promise((resolve, reject) => {
    const buf = Buffer.from(JSON.stringify(data, null, '  '));
    fs.writeFile(path, buf, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

export function precision(num, r, unit) {
  return String(Math.round(num * r) / r) + unit;
}

export function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function getDistanceString(value: number, imperial: boolean = false) {
  if (imperial) {
    return precision(value / 1609.344, 100, ' miles');
  } else {
    return precision(value / 1000, 100, ' km');
  }
}

export function getElevationString(value: number, imperial: boolean = false) {
  if (imperial) {
    return precision(value / 0.3048, 1, ' ft');
  } else {
    return precision(value, 1, ' m');
  }
}

export function getTemperatureString(value: number, imperial: boolean = false) {
  if (imperial) {
    return precision((value * 9) / 5 + 32, 1, '&deg;F');
  } else {
    return value + '&deg;C';
  }
}

export const logConsole: LogFunctions = {
  info: (msg) => console.log('INFO: ' + msg),
  debug: (msg) => console.log('DEBUG: ' + msg),
  verbose: (msg) => {
    return;
  },
  error: (msg) => console.log('ERROR: ' + msg),
  warn: (msg) => console.log('WARN: ' + msg),
};
