import type { Ctx } from '../dep.ts';
import * as Options from '../options/mod.ts';
import type * as Cmd from '../types.ts';

/**
 * Command to generate PDF reports from Strava data.
 * Delegates business logic to the app layer for reusability.
 */
export class PdfCmd extends Options.BaseSubCmd {
  constructor() {
    super('pdf', 'Generate PDF reports from Strava data.');
  }

  /**
   * Initialize the PDF command with its action handler.
   * @param ctx - Application context
   * @returns Promise resolving to the configured command
   */
  init(ctx: Ctx.Context): Promise<Cmd.Command> {
    this.cmd.init(ctx).action(async () => {
      try {
        ctx.log.info.info('PDF generation not yet implemented').emit();
        // TODO: Implement PDF generation functionality
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        ctx.log.error.error(`Failed to generate PDF: ${errorMsg}`).emit();
        throw err;
      }
    });
    return Promise.resolve(this.cmd);
  }
}
