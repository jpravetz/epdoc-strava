import { DateEx } from '@epdoc/datetime';
import type { FileSpec } from '@epdoc/fs';
import { _ } from '@epdoc/type';
import type * as Ctx from '../context.ts';
import type { Api } from '../dep.ts';
import type * as Segment from './types.ts';
import { asCacheEntry } from './utils.ts';

/**
 * Manages the cache of starred segments stored in ~/.strava/user.segments.json
 *
 * This class handles:
 * - Loading/saving segment metadata from/to local cache
 * - Refreshing segment data from Strava API
 * - Providing fast lookup by segment ID
 * - The cache does NOT include the segment coordinates, which must be retrieved each time they are needed.
 *
 * The cache reduces API calls by storing segment metadata locally and only
 * fetching fresh data when explicitly refreshed or when the cache doesn't exist.
 */
export class SegmentFile {
  #fsFile: FileSpec;
  #segments: Map<number, Segment.CacheEntry> = new Map(); // Keyed by segment ID

  constructor(fsFile: FileSpec) {
    this.#fsFile = fsFile;
  }

  async get(ctx: Ctx.Context, opts: { refresh?: boolean }): Promise<void> {
    ctx.log.info.h2('Retrieving list of starred segments from server').emit();
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
    const summarySegments: Api.Schema.SummarySegment[] = [];
    ctx.log.info.h2('Retrieving Strava starred segments from server ...').emit();
    const m0 = ctx.log.mark();
    try {
      ctx.log.indent();
      await ctx.app.api.getStarredSegments(ctx, summarySegments);
      ctx.log.outdent();
      ctx.log.info.h2('Found').count(summarySegments.length).h2('starred segments').ewt(m0);
      this.#segments = new Map();
      summarySegments.forEach((seg) => {
        const newEntry = asCacheEntry(seg);
        if (newEntry) {
          if (this.#segments.has(newEntry.id)) {
            const oldEntry = this.#segments.get(newEntry.id);
            ctx.log.info.h2('Segment').label(seg.name)
              .h2(`ID ${seg.id} (${oldEntry!.distance},${oldEntry!.elevation}) already exists.`)
              .h2(`Overwriting with (${newEntry.distance},${newEntry.elevation}).`)
              .emit();
          }
          this.#segments.set(newEntry.id, newEntry);
        }
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
      await this.#fsFile.writeJson(json, null, 2);
      ctx.log.info.h2('Wrote').count(this.#segments.size)
        .h2('starred segments to').path(this.#fsFile).ewt(m0);
    } catch (e) {
      const err = _.asError(e);
      ctx.log.error.h2('Error writing to file').err(err).path(this.#fsFile.path).ewt(m0);
    }
  }

  /**
   * Get a specific segment by ID.
   *
   * @param id Segment ID
   * @returns CacheEntry if found, undefined otherwise
   */
  getSegment(id: Api.Schema.SegmentId): Segment.CacheEntry | undefined {
    return this.#segments.get(String(id));
  }

  /**
   * Get all cached segments as an array.
   *
   * @returns Array of all cached segment entries
   */
  getAllSegments(): Segment.CacheEntry[] {
    return Array.from(this.#segments.values());
  }
}
