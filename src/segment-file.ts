import { SegmentName } from './models/segment-base';
import { StravaApi } from './strava-api';
import { SummarySegment } from './models/summary-segment';
import fs from 'fs';
import { Metres, readJson, writeJson } from './util';

export type GpsDegrees = number;

export type SegmentCacheEntry = {
  name?: SegmentName;
  distance?: Metres;
  gradient?: number;
  elevation?: Metres;
};

export class SegmentFile {
  filepath: string;
  api: StravaApi;
  lastModified: Date;
  segments: Record<string, SegmentCacheEntry> = {};

  constructor(filepath: string, stravaApi: StravaApi) {
    this.filepath = filepath;
    this.api = stravaApi;
  }

  get(opts: { refresh?: boolean }) {
    console.log('Retrieving list of starred segments');
    if (opts.refresh) {
      return this.getFromServer().then(resp => {
        return this.write();
      });
    } else {
      return this.read().catch(err => {
        console.log(`  Error reading starred segments from ${this.filepath}`);
        console.log('    ' + err.message);
        return this.getFromServer().then(() => {
          return this.write();
        });
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
                if (resp.segments) {
                  this.segments = resp.segments;
                }
                console.log(`Read ${Object.keys(this.segments).length} starred segments from ${this.filepath}`);
                resolve();
              })
              .catch(err => {
                reject(err);
              });
          }
        });
      } else {
        reject(new Error('File not found'));
      }
    });
  }

  getFromServer(): Promise<void> {
    // this.starredSegments = [];
    let summarySegments: SummarySegment[] = [];
    console.log('  Retrieving starred segments from Strava ...');
    return this.api
      .getStarredSegments(summarySegments)
      .then(() => {
        // this.segments = resp;
        console.log('  Found %s starred segments', summarySegments.length);
        this.segments = {};
        summarySegments.forEach(seg => {
          this.segments[seg.name] = seg.asCacheEntry();
        });
      })
      .catch(err => {
        err.message = 'Starred segments - ' + err.message;
        throw err;
      });
  }

  write(): Promise<void> {
    let json: Record<string, any> = {
      description: 'Strava segments',
      segments: this.segments
    };
    return writeJson(this.filepath, json).then(resp => {
      console.log(`Wrote ${Object.keys(this.segments).length} starred segments to ${this.filepath}`);
    });
  }

  getSegment(name: string): SegmentCacheEntry {
    return this.segments[name];
  }
}
