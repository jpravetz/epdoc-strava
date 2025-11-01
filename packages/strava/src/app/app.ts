import * as FS from '@epdoc/fs/fs';
import { _, type Dict } from '@epdoc/type';
import { assert } from '@std/assert/assert';
import type * as Ctx from '../context.ts';
import { Api } from '../dep.ts';

const home = Deno.env.get('HOME');
assert(home, 'Environment variable HOME is missing');

/**
 * Main application class that handles Strava API interactions and business logic.
 * This class is designed to be reusable across different interfaces (CLI, web, etc.).
 */
export class Main {
  #api?: Api.Api<Ctx.MsgBuilder, Ctx.Logger>;
  athlete?: Api.Schema.DetailedAthlete;
  notifyOffline = false;

  constructor() {
    // Initialize with defaults
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
  async init(ctx: Ctx.Context, opts: { strava?: boolean; config?: boolean } = {}): Promise<void> {
    if (opts.config) {
      // TODO: Load configuration files
    }
    
    if (opts.strava) {
      await this.initClient();
    }
  }

  /**
   * Initialize the Strava API client.
   */
  async initClient(): Promise<void> {
    // Check for required environment variables
    const clientId = Deno.env.get('STRAVA_CLIENT_ID');
    const clientSecret = Deno.env.get('STRAVA_CLIENT_SECRET');
    
    if (!clientId || !clientSecret) {
      throw new Error(
        'Missing Strava API credentials. Please set:\n' +
        '  export STRAVA_CLIENT_ID="your_client_id"\n' +
        '  export STRAVA_CLIENT_SECRET="your_client_secret"\n\n' +
        'Get credentials at: https://www.strava.com/settings/api'
      );
    }
    
    const clientConfig = { id: clientId, secret: clientSecret };
    const credsFile = new FS.File(home, '.strava', 'credentials.json');
    
    this.#api = new Api.Api(clientConfig, credsFile);
  }

  /**
   * Check if internet access is available.
   * @param _ctx - Application context (unused for now)
   * @returns Promise resolving to true if online
   */
  async checkInternetAccess(_ctx: Ctx.Context): Promise<boolean> {
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
      ctx.log.info.info(`Retrieved athlete: ${this.athlete.firstname} ${this.athlete.lastname}`).emit();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      ctx.log.error.error(`Failed to get athlete: ${errorMsg}`).emit();
      throw err;
    }
  }
}
