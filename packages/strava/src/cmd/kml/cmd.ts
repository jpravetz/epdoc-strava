import type { Ctx } from '../dep.ts';
import * as Options from '../options/mod.ts';
import type * as Cmd from '../types.ts';

/**
 * Command to generate KML files from Strava data.
 * Delegates business logic to the app layer for reusability.
 */
export class KmlCmd extends Options.BaseSubCmd {
  constructor() {
    super('kml', 'Generate KML files from Strava activities and segments.');
  }

  /**
   * Initialize the KML command with its action handler.
   * @param ctx - Application context
   * @returns Promise resolving to the configured command
   */
  init(ctx: Ctx.Context): Promise<Cmd.Command> {
    this.cmd.init(ctx).action(async () => {
      try {
        ctx.log.info.info('KML generation not yet implemented').emit();
        // TODO: Implement KML generation functionality
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        ctx.log.error.error(`Failed to generate KML: ${errorMsg}`).emit();
        throw err;
      }
    });
    return Promise.resolve(this.cmd);
  }
}
