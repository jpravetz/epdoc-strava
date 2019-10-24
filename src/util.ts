import fs from 'fs';

export function sortBy() {}

export type Dict = Record<string, any>;

export type EpochMilliseconds = number;
export type EpochSeconds = number;
export type Seconds = number;
export type Metres = number;
export type Kilometres = number;
export type IsoDateString = string;

export type formatHMSOpts = {
  seconds?: boolean;
};

export function formatHMS(s: Seconds, options?: formatHMSOpts): string {
  options || (options = {});
  let seconds = s % 60;
  let minutes = Math.floor(s / 60) % 60;
  let hours = Math.floor(s / (60 * 60));
  let result = this.pad(hours) + ':';
  result += this.pad(minutes);
  if (options.seconds !== false) {
    result += ':' + this.pad(seconds);
  }
  return result;
}

export function formatMS(s: Seconds, options?): string {
  let seconds = s % 60;
  let minutes = Math.floor(s / 60);
  let result = minutes + ':';
  result += this.pad(seconds);
  return result;
}

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
    let buf = new Buffer(JSON.stringify(data, null, '  '));
    fs.writeFile(path, buf, err => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

export function julianDate(d: Date): number {
  return Math.floor(d.getTime() / 86400000 - d.getTimezoneOffset() / 1440 + 2440587.5) + 1;
}
