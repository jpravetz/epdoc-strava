import { DateEx } from '@epdoc/datetime';
import type { FileSpec } from '@epdoc/fs';
import { _ } from '@epdoc/type';
import type * as Ctx from '../context.ts';
import type { Strava } from './dep.ts';
import type * as Segment from './types.ts';

export class SegmentFile {
  #fsFile: FileSpec;
  #api: Strava.Api;
  #segments: Map<Segment.Name, Segment.CacheEntry> = new Map();

  constructor(fsFile: FileSpec, stravaApi: Strava.Api) {
    this.#fsFile = fsFile;
    this.#api = stravaApi;
  }

  async get(ctx: Ctx.Context, opts: { refresh?: boolean }): Promise<void> {
    ctx.log.info.h2('Retrieving list of starred segments').emit();
    try {
      if (opts.refresh) {
        await this.#getFromServer(ctx);
        await this.write(ctx);
      } else {
        await this.read(ctx);
      }
    } catch (err) {
      ctx.log.info.h2(`Error reading starred segments from ${this.#fsFile.path}`).ewt(ctx.log.mark());
      ctx.log.info.h2('    ' + (err as Error).message).ewt(ctx.log.mark());
      await this.#getFromServer(ctx);
      await this.write(ctx);
    }
  }

  async #getFromServer(ctx: Ctx.Context): Promise<void> {
    // this.starredSegments = [];
    let summarySegments: Strava.Schema.SegmentSummary[] = [];
    ctx.log.info.h2('Retrieving starred segments from Strava ...').emit();
    const m0 = ctx.log.mark();
    try {
      summarySegments = await this.#api.getStarredSegments(summarySegments);
      ctx.log.info.h2('Found').count(summarySegments.length).h2('starred segments').ewt(m0);
      this.#segments = new Map();
      summarySegments.forEach((seg) => {
        const newEntry = seg.asCacheEntry();
        if (this.#segments.has(seg.name)) {
          const exists = this.#segments.get(seg.name);
          ctx.log.info.h2('Segment').label(seg.name)
            .h2(`(${exists!.distance},${exists!.elevation}) already exists.`)
            .h2(`Overwriting with (${newEntry.distance},${newEntry.elevation}).`)
            .emit();
        }
        this.#segments.set(seg.name, newEntry);
      });
    } catch (e) {
      const err = _.asError(e);
      err.message = 'Starred segments - ' + err.message;
      throw err;
    }
  }

  async read(ctx: Ctx.Context): Promise<void> {
    const m0 = ctx.log.mark();
    const isFile = await this.#fsFile.isFile();
    if (isFile) {
      const data = await this.#fsFile.readJson<Segment.CacheFile>();
      if (data.segments) {
        this.#segments = new Map(Object.entries(data.segments));
      }
      ctx.log.info.h2('Read').count(this.#segments.size).h2('starred segment')
        .h2('from').path(this.#fsFile.path).ewt(m0);
    } else {
      ctx.log.info.h2('File not found').path(this.#fsFile.path).ewt(m0);
    }
  }

  async write(ctx: Ctx.Context): Promise<void> {
    const json: Record<string, unknown> = {
      description: 'Strava segments',
      lastModified: new DateEx().toISOLocalString(),
      segments: Object.fromEntries(this.#segments),
    };
    const m0 = ctx.log.mark();
    try {
      await this.#fsFile.writeJson(json);
      ctx.log.info.h2('Wrote').count(this.#segments.size)
        .h2('starred segments to').path(this.#fsFile).ewt(m0);
    } catch (e) {
      const err = _.asError(e);
      ctx.log.error.h2('Error writing to file').err(err).path(this.#fsFile.path).ewt(m0);
    }
  }

  getSegment(name: string): Segment.CacheEntry | undefined {
    return this.#segments.get(name);
  }
}
