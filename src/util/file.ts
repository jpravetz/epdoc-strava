import fs from 'fs';

export type Dict = Record<string, any>;

export type EpochMilliseconds = number;
export type EpochSeconds = number;

export function sortBy() {}

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
