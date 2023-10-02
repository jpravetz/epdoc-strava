import { Dict, isDict, isFunction, isInteger, isNonEmptyString } from 'epdoc-util';
import fs from 'fs';

export function compare(a: Dict, b: Dict, key: string) {
  if (a[key] < b[key]) {
    return -1;
  }
  if (a[key] > b[key]) {
    return 1;
  }
  return 0;
}

export type FilePath = string;
export type FolderPath = string;
export type FileName = string;
export type FileExt = string; // includes '.'

export function isFilePath(val: any): val is FilePath {
  return isNonEmptyString(val);
}

export function isFolderPath(val: any): val is FolderPath {
  return isNonEmptyString(val);
}

export function isFileName(val: any): val is FileName {
  return isNonEmptyString(val);
}

// export type Dict = Record<string, any>;

export type EpochMilliseconds = number;
export type EpochSeconds = number;
export type Seconds = number;
export type Metres = number;
export type Kilometres = number;
export type IsoDateString = string;

export function isEpochSeconds(val: any): val is EpochSeconds {
  return isInteger(val) && val >= 0;
}

// export type formatHMSOpts = {
//   seconds?: boolean;
// };

export type LogFunction = (msg: string) => void;
export function isLogFunction(val: any): val is LogFunction {
  return isFunction(val);
}
export type LogFunctions = {
  info: LogFunction;
  warn: LogFunction;
  debug: LogFunction;
  error: LogFunction;
  verbose: LogFunction;
};
export function isLogFunctions(val: any): val is LogFunction {
  return (
    isDict(val) &&
    isLogFunction(val.info) &&
    isLogFunction(val.warn) &&
    isLogFunction(val.error) &&
    isLogFunction(val.debug) &&
    isLogFunction(val.verbose)
  );
}
export type LogOpts = {
  log: LogFunctions;
};

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
