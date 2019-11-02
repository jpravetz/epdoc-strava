import fs from 'fs';
import { Metres, readJson } from './util';

export type GpsDegrees = number;

export type SegmentCacheEntry = {
  name?: string;
  distance?: Metres;
  average_grade?: number;
  elevaion_high?: Metres;
  elevation_low?: Metres;
  start_latlng?: GpsDegrees[];
  end_laglng?: GpsDegrees[];
};

export class SegmentFile {
  filepath: string;
  lastModified: Date;
  aliases: Record<string, string> = {};
  segments: Record<string, SegmentCacheEntry> = {};

  constructor(filepath: string) {
    this.filepath = filepath;
  }

  get(opts: { cache?: boolean }) {
    if (opts.cache) {
      return this.read().catch(err => {
        getNetwork();
      });
    }
  }

  read(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (fs.existsSync(this.filepath)) {
        fs.stat(this.filepath, (err, stats) => {
          if (err) {
            reject(err);
          } else {
            this.lastModified = stats.mtime;
            readJson(this.filepath)
              .then(resp => {
                if (resp.aliases) {
                  this.aliases = resp.aliases;
                }
                if (resp.segments) {
                  this.segments = resp.segments;
                }
                resolve();
              })
              .catch(err => {
                reject(err);
              });
          }
        });
      } else {
        reject('File does not exist');
      }
    });
  }
}
