import type * as BikeLog from '../../bikelog/mod.ts';
import type { Ctx } from '../dep.ts';
import * as Options from '../options/mod.ts';
import type * as Cmd from '../types.ts';

export const cmdConfig: Options.Config = {
  replace: { cmd: 'PDF' },
  options: {
    output: true,
    date: true,
    // Note: imperial and dryRun are global options defined in root command
  },
};

/**
 * Command to generate PDF/XML reports from Strava data.
 * Generates XML data compatible with Adobe Acrobat Forms.
 * Delegates business logic to the app layer for reusability.
 */
export class PdfCmd extends Options.BaseSubCmd {
  constructor() {
    super('pdf', 'Generate XML data for Adobe Acrobat Forms bikelog from Strava activities.');
  }

  /**
   * Initialize the PDF command with its action handler.
   * @param ctx - Application context
   * @returns Promise resolving to the configured command
   */
  init(ctx: Ctx.Context): Promise<Cmd.Command> {
    this.cmd.init(ctx).action(async (opts) => {
      try {
        // Initialize app with required services
        await ctx.app.init(ctx, { strava: true, userSettings: true });

        // Ensure we have athlete info
        if (!ctx.app.athlete) {
          await ctx.app.getAthlete(ctx);
        }

        // Build PDF options from command opts
        const pdfOpts: BikeLog.Opts = {
          output: opts.output,
          date: opts.date,
        };

        // Call app layer to generate PDF/XML
        await ctx.app.getPdf(ctx, pdfOpts);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        ctx.log.error.error(`Failed to generate PDF/XML: ${errorMsg}`).emit();
        throw err;
      }
    });

    this.addOptions(cmdConfig);
    return Promise.resolve(this.cmd);
  }
}
