import type { FileSpec } from '@epdoc/fs';
import type * as Ctx from '../context.ts';
import { StravaApi } from './strava-api';
import type { SegmentSummary } from './summary.ts';
import type * as Segment from './types.ts';

type SegmentCache = {
  description?: string;
  segments: Segment.CacheEntry[];
};

export class SegmentFile {
  private fsFile: FileSpec;
  private api: StravaApi;
  private lastModified: Date;
  private segments: SegmentCache = {};

  constructor(fsFile: FileSpec, stravaApi: StravaApi) {
    this.fsFile = fsFile;
    this.api = stravaApi;
  }

  public async get(opts: { refresh?: boolean }): Promise<void> {
    console.log('Retrieving list of starred segments');
    if (opts.refresh) {
      return this.getFromServer().then((resp) => {
        return this.write();
      });
    } else {
      return this.read().catch((err) => {
        console.log(`  Error reading starred segments from ${fsFile.path}`);
        console.log('    ' + err.message);
        return this.getFromServer().then(() => {
          return this.write();
        });
      });
    }
  }

  public async read(ctx: Ctx.Context): Promise<void> {
    const isFile = await this.fsFile.isFile();
    if (isFile) {
      const data = await this.fsFile.readJson<{ segments: SegmentCache }>();
      if (data.segments) {
        this.segments = data.segments;
      }
      ctx.log.info.h2('Read').count(Object.keys(this.segments).length).h2('starred segment').h2('from').path(
        this.fsFile.path,
      ).emit();
    } else {
      ctx.log.info.h2('File not found').path(this.fsFile.path).emit();
    }
  }

  private async getFromServer(): Promise<void> {
    // this.starredSegments = [];
    const summarySegments: SegmentSummary[] = [];
    console.log('  Retrieving starred segments from Strava ...');
    return this.api
      .getStarredSegments(summarySegments)
      .then(() => {
        // this.segments = resp;
        console.log('  Found %s starred segments', summarySegments.length);
        this.segments = {};
        summarySegments.forEach((seg) => {
          const newEntry = seg.asCacheEntry();
          if (this.segments[seg.name]) {
            console.log(
              `Segment ${seg.name} (${this.segments[seg.name].distance},${
                this.segments[seg.name].elevation
              }) already exists. Overwriting with (${newEntry.distance},${newEntry.elevation}).`,
            );
          }
          this.segments[seg.name] = newEntry;
        });
      })
      .catch((err) => {
        err.message = 'Starred segments - ' + err.message;
        throw err;
      });
  }

  public async write(): Promise<void> {
    const json: Record<string, any> = {
      description: 'Strava segments',
      segments: this.segments,
    };
    return writeJson(this.filepath, json).then((resp) => {
      console.log(`Wrote ${Object.keys(this.segments).length} starred segments to ${this.filepath}`);
    });
  }

  public getSegment(name: string): SegmentCacheEntry {
    return this.segments[name];
  }
}
