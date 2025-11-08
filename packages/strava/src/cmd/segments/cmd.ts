import { _ } from '@epdoc/type';
import type { Ctx } from '../dep.ts';
import * as Options from '../options/mod.ts';
import type * as Cmd from '../types.ts';

export const cmdConfig: Options.Config = {
  replace: { cmd: 'segments' },
  options: {
    dates: true,
    refresh: true,
    dryRun: true,
  },
};

/**
 * Command to analyze starred segments with effort times.
 */
export class SegmentsCmd extends Options.BaseSubCmd {
  constructor() {
    super('segments', 'Analyze starred segments with effort times.');
  }

  /**
   * Initialize the segments command with its action handler.
   * @param ctx - Application context
   * @returns Promise resolving to the configured command
   */
  init(ctx: Ctx.Context): Promise<Cmd.Command> {
    this.cmd.init(ctx).action(async (_opts: Record<string, unknown>) => {
      try {
        await ctx.app.init(ctx, { strava: true, userSettings: true });
        // TODO: Implement segments analysis functionality
        ctx.log.info.text('Segments command not yet implemented').emit();
      } catch (e) {
        const err = _.asError(e);
        ctx.log.error.error(`Failed to analyze segments: ${err.message}`).emit();
        throw err;
      }
    });
    this.addOptions(cmdConfig);
    return Promise.resolve(this.cmd);
  }
}
