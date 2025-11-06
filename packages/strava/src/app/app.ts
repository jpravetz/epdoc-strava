import * as FS from '@epdoc/fs/fs';
import { _ } from '@epdoc/type';
import { assert } from '@std/assert/assert';
import rawConfig from '../config.json' with { type: 'json' };
import type * as Ctx from '../context.ts';
import { Api } from '../dep.ts';
import type * as App from './types.ts';

const home = Deno.env.get('HOME');
assert(home, 'Environment variable HOME is missing');
assert(
  _.isDict(rawConfig) && 'paths' in rawConfig && _.isDict(rawConfig.paths),
  'Invalid application configuration',
);
const lessRaw = _.deepCopy(rawConfig, { replace: { 'HOME': home }, pre: '${', post: '}' }) as App.ConfigFile;
const configPaths = lessRaw.paths;

/**
 * Main application class that handles Strava API interactions and business logic.
 * This class is designed to be reusable across different interfaces (CLI, web, etc.).
 */
export class Main {
  #api: Api.Api<Ctx.MsgBuilder, Ctx.Logger>;
  athlete?: Api.Schema.DetailedAthlete;
  userSettings?: App.UserSettings;
  notifyOffline = false;

  constructor() {
    // Initialize with defaults
    this.#api = new Api.Api(configPaths.userCreds, [{ path: configPaths.clientCreds }, { env: true }]);
  }

  /**
   * Get the API client instance.
   * @throws Error if API not initialized
   */
  get api(): Api.Api<Ctx.MsgBuilder, Ctx.Logger> {
    if (!this.#api) {
      throw new Error('API not initialized. Call initClient() first.');
    }
    return this.#api;
  }

  /**
   * Initialize the application with specified services.
   * @param ctx - Application context
   * @param opts - Initialization options specifying what to initialize
   */
  async init(ctx: Ctx.Context, opts: App.Opts = {}): Promise<void> {
    if (opts.config) {
      // TODO: Load configuration files
    }

    if (opts.strava) {
      await this.#api.init(ctx);
    }

    if (opts.userSettings) {
      this.userSettings = await new FS.File(configPaths.userSettings).readJson();
    }
  }

  /**
   * Check if internet access is available.
   * @param _ctx - Application context (unused for now)
   * @returns Promise resolving to true if online
   */
  checkInternetAccess(_ctx: Ctx.Context): Promise<boolean> {
    // Simple internet check - for now just return true
    // TODO: Implement actual internet connectivity check
    return Promise.resolve(true);
  }

  /**
   * Set the athlete ID for API calls.
   * @param _id - Athlete ID to set
   */
  setAthleteId(_id: string): Promise<void> {
    // TODO: Implement athlete ID storage and usage
    return Promise.resolve();
  }

  /**
   * Retrieve athlete information from Strava API.
   * @param ctx - Application context for logging
   * @param athleteId - Optional specific athlete ID to retrieve
   */
  async getAthlete(ctx: Ctx.Context, athleteId?: Api.Schema.AthleteId): Promise<void> {
    try {
      this.athlete = await this.api.getAthlete(ctx, athleteId);
      ctx.log.info.h2(`Retrieved athlete: ${this.athlete.firstname} ${this.athlete.lastname}`).emit();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      ctx.log.error.error(`Failed to get athlete: ${errorMsg}`).emit();
      throw err;
    }
  }
}
