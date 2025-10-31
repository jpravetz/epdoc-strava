import type { DateRanges } from '@epdoc/daterange';
import type * as FS from '@epdoc/fs/fs';
import type { Ctx } from '../dep.ts';
import * as Options from '../options/mod.ts';
import type * as Cmd from '../types.ts';

/**
 * Defines the CLI interface for the `assign` command.
 */
const cmdConfig: Options.Config = {
  options: {
    date: true,
    output: true,
  },
};

/**
 * Holds the parsed options for the `assign` command.
 */
type KmlOpts = {
  date?: DateRanges;
  output?: FS.FilePath;
};

/**
 * Implements the `assign` command, which is responsible for analyzing messages
 * and assigning them to providers based on predefined conditions.
 */
export class KmlCmd extends Options.BaseSubCmd {
  constructor() {
    super(
      'kml',
      'Output messages to KML file.',
    );
  }

  /**
   * Initializes the `assign` command and its action.
   *
   * The command's action performs the following workflow:
   * 1. Fetches messages to be processed, either from command-line arguments or
   *    by searching with the provided options.
   * 2. Analyzes the messages to determine their provider assignments.
   * 3. Optionally exports associated PDFs.
   * 4. Optionally lists the results of the analysis.
   *
   * @param ctx - The application context.
   * @returns A promise that resolves to the initialized command object.
   */
  init(ctx: Ctx.Context): Promise<Cmd.Command> {
    this.cmd.init(ctx)
      .action(async (args: string[], kmlOpts: KmlOpts) => {
        const msgs: Msg.Messages = await this.getMessages(ctx, args, assignOpts);
        await ctx.app.init(ctx, { db: true, config: true, services: true });

        const analyzerOpts: MsgOp.AnalyzerOpts = {
          limit: assignOpts.limit,
          refresh: assignOpts.refresh,
          refreshLabels: true,
        };
        await msgs.analyze(analyzerOpts);

        if (assignOpts.export) {
          const exportOpts: Msg.ExportPdfOpts = {
            overwrite: assignOpts.overwrite,
            validate: false,
            dryRun: assignOpts.dryRun,
          };
          await msgs.exportPdfs(exportOpts);
        }

        if (assignOpts.list && !assignOpts.dryRun) {
          const listOpts: IOutput = {};
          if (assignOpts.list instanceof FileSpec) listOpts.output = assignOpts.list;
          await msgs.list(listOpts);
        }
      });
    this.addOptions(cmdConfig);
    return Promise.resolve(this.cmd);
  }
}
