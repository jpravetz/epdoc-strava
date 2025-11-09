import type { DateRanges } from '@epdoc/daterange';
import type * as BikeLog from '../../bikelog/mod.ts';
import type { Ctx } from '../dep.ts';
import * as Options from '../options/mod.ts';
import type * as Cmd from '../types.ts';

export const cmdConfig: Options.Config = {
  replace: { cmd: 'XML' },
  options: {
    output: true,
    date: true,
    // Note: imperial and dryRun are global options defined in root command
  },
};

type PdfCmdOpts = {
  date?: DateRanges;
  output: string;
};

/**
 * Command to generate Adobe Acroforms XML files for bikelog PDF forms.
 *
 * This command creates XML files compatible with Adobe Acrobat PDF forms for logging
 * bike rides and activities. The XML output includes:
 * - Daily activity summaries (up to 2 bike rides per day tracked)
 * - Ride metrics: distance, bike name, elevation, moving time
 * - Activity descriptions and private notes merged and parsed
 * - Custom properties extracted from descriptions (key=value format)
 * - Weight data automatically extracted and placed in dedicated field
 * - Non-bike activities (Run, Swim, etc.) included in notes
 *
 * The generated XML can be imported into Adobe Acrobat to populate form fields
 * in a bikelog PDF template.
 *
 * @example
 * ```bash
 * # Generate bikelog XML for 2024
 * deno run -A ./packages/strava/main.ts pdf \
 *   --date 20240101-20241231 \
 *   --output bikelog2024.xml
 * ```
 */
export class PdfCmd extends Options.BaseSubCmd {
  constructor() {
    super('pdf', 'Generate XML data for Adobe Acrobat Forms bikelog from Strava activities.');
  }

  /**
   * Initializes the PDF command with its action handler and options.
   *
   * Sets up the command action that:
   * 1. Initializes app with Strava API and user settings
   * 2. Ensures athlete info is loaded (for bike list)
   * 3. Builds PDF options from command-line arguments
   * 4. Delegates to ctx.app.getPdf() for XML generation
   *
   * @param ctx Application context with logging and app instance
   * @returns Promise resolving to the configured command instance
   */
  init(ctx: Ctx.Context): Promise<Cmd.Command> {
    this.cmd.init(ctx).action(async (opts: PdfCmdOpts) => {
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
