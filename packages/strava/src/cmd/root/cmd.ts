import * as CliApp from '@epdoc/cliapp';
import type { Ctx } from '../dep.ts';
import * as Athlete from '../athlete/mod.ts';
import * as Kml from '../kml/mod.ts';
import * as Pdf from '../pdf/mod.ts';
import * as Segments from '../segments/mod.ts';
import * as Cmd from '../types.ts';
import type * as Root from './types.ts';
import { Api } from '../../dep.ts';

/**
 * Main class responsible for handling the command-line interface of the FinSync
 * application. This class configures and processes command-line arguments, then
 * uses the App class to perform the specified operations.
 */
export class RootCmd {
  cmd: Cmd.Command;

  constructor(ctx: Ctx.Context) {
    this.cmd = new Cmd.Command(ctx.pkg);
  }
  /**
   * Executes the main application logic based on command-line arguments.
   * @param {Context} ctx - The application context containing configurations and state
   * @returns {Promise<void>} A promise that resolves when all operations are complete
   * @throws {Error} If command parsing or execution fails
   */
  async init(ctx: Ctx.Context): Promise<Cmd.Command> {
    // let forceOffline = false;
    const onlinePromise = ctx.app.checkInternetAccess(ctx);
    //   if (resp === true && !forceOffline) {
    //     ctx.online = true;
    //   } else {
    //     this.app.notifyOffline = true;
    //   }
    // });
    await this.cmd.init(ctx);
    // Individual commands will call ctx.app.init() with what they need
    // await ctx.app.initClient(); // Removed - let commands initialize what they need
    // await ctx.app.initOpts();
    // await this.app.init(ctx, { config: true });

    const pdfCmd = new Pdf.Cmd();
    const kmlCmd = new Kml.Cmd();
    const segmentsCmd = new Segments.Cmd();
    const athleteCmd = new Athlete.Cmd();

    this.cmd.addCommand(await pdfCmd.init(ctx));
    this.cmd.addCommand(await kmlCmd.init(ctx));
    this.cmd.addCommand(await segmentsCmd.init(ctx));
    this.cmd.addCommand(await athleteCmd.init(ctx));

    this.cmd.hook('preAction', async (cmd, _actionCmd) => {
      const opts = cmd.opts<Root.RootOpts>();
      CliApp.configureLogging(ctx, opts);

      // Set dry-run mode
      if (opts.dryRun) {
        ctx.dryRun = true;
      }

      if (opts.offline) {
        ctx.online = false;
        ctx.app.notifyOffline;
        await onlinePromise; // do nothing with result
      } else {
        ctx.online = await onlinePromise;
        if (!ctx.online) {
          ctx.app.notifyOffline = true;
        }
      }
      // ctx.log.warn.warn('Offline - some operations may not be available').emit();

      if (Api.isAthleteId(opts.athleteId)) {
        await ctx.app.setAthleteId(opts.athleteId);
      }
      // ctx.testOpts = this.configureTestOpts(ctx, opts);
      // if (ctx.dryRun) {
      //   ctx.log.warn.warn('RUNNING IN TEST MODE');
      // }
    });

    this.addOptions(ctx);
    // this.cmd.addDryRun();
    this.cmd.addLogging(ctx);
    await this.cmd.parseOpts();
    return Promise.resolve(this.cmd);
  }

  /**
   * Adds all of our command-line options to the CLI application.
   *
   * @param {Context} ctx - The application context (unused)
   * @param {CliApp.Command} cmd - The command object to add options to
   * @returns {this} The current instance for method chaining
   */
  addOptions(_ctx: Ctx.Context): this {
    const options = [
      new CliApp.Commander.Option('-i, --id <athleteId>', 'Athlete ID. Defaults to your login.'),
      new CliApp.Commander.Option('--imperial', 'Use imperial units'),
      new CliApp.Commander.Option('--offline', 'Offline mode'),
      new CliApp.Commander.Option(
        '-n, --dry-run',
        'Do not modify any data (database, files or server).',
      ),
    ];

    options.forEach((option) => this.cmd.addOption(option));

    this.cmd.addHelpText('after', ['\nAdd a note about login here.'].join(' '));
    return this;
  }
}
