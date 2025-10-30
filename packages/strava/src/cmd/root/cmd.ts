import * as CliApp from '@epdoc/cliapp';
import pkg from '../../../deno.json' with { type: 'json' };
import { App, type Ctx } from '../dep.ts';
import * as Kml from '../kml/mod.ts';
import * as Pdf from '../pdf/mod.ts';
import * as Cmd from '../types.ts';
import type * as Root from './types.ts';

/**
 * Main class responsible for handling the command-line interface of the FinSync
 * application. This class configures and processes command-line arguments, then
 * uses the App class to perform the specified operations.
 */
export class RootCmd {
  app: App.Main;
  cmd: Cmd.Command;

  constructor() {
    this.app = new App.Main();
    this.cmd = new Cmd.Command(pkg);
  }
  /**
   * Executes the main application logic based on command-line arguments.
   * @param {Context} ctx - The application context containing configurations and state
   * @returns {Promise<void>} A promise that resolves when all operations are complete
   * @throws {Error} If command parsing or execution fails
   */
  async init(ctx: Ctx.Context): Promise<Cmd.Command> {
    // let forceOffline = false;
    const onlinePromise = this.app.checkInternetAccess(ctx);
    //   if (resp === true && !forceOffline) {
    //     ctx.online = true;
    //   } else {
    //     this.app.notifyOffline = true;
    //   }
    // });
    ctx.app = this.app;
    ctx.pkg = pkg;
    this.cmd.init(ctx);
    await this.app.initOpts();
    // await this.app.init(ctx, { config: true });

    const pdfCmd = new Pdf.Cmd();
    const kmlCmd = new Kml.Cmd();

    this.cmd.addCommand(await pdfCmd.init(ctx));
    this.cmd.addCommand(await kmlCmd.init(ctx));

    this.cmd.hook('preAction', async (cmd, _actionCmd) => {
      const opts = cmd.opts<Root.RootOpts>();
      CliApp.configureLogging(ctx, opts);
      if (opts.offline) {
        ctx.online = false;
        this.app.notifyOffline;
        await onlinePromise; // do nothing with result
      } else {
        ctx.online = await onlinePromise;
        if (!ctx.online) {
          this.app.notifyOffline = true;
        }
      }
      // ctx.log.warn.warn('Offline - some operations may not be available').emit();

      await this.app.setProfile(opts.profile);
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
      new CliApp.Commander.Option('-P, --profile <urn>', 'Profile URN to use for this run.').default(
        this.app.opts.urn,
      ),
      new CliApp.Commander.Option('--offline', 'Force offline behavior'),
    ];

    options.forEach((option) => this.cmd.addOption(option));

    this.cmd.addHelpText(
      'after',
      [
        '\nA configuration file is required when using finsync.',
        'All messages and attachments are downloaded and retained in a database and file folder that is specified in the configuration file.',
      ].join(' '),
    );
    return this;
  }
}
