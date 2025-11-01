import * as CliApp from '@epdoc/cliapp';
import * as Strava from './src/mod.ts';

/**
 * Executes the main functionality of the FinSync application based on the provided context and options.
 *
 * @param ctx - The context object containing necessary configurations and state for the application.
 * @param opts - Command line options that dictate the operations to be performed.
 * @param appOpts - Application-specific options for initializing the FinSync application.
 * @returns A promise that resolves when the execution is complete.
 *
 * The function performs the following operations:
 * - Initializes the FinSync application.
 * - Logs the number of messages in the local cache.
 * - Initializes Gmail if certain options are provided.
 * - Lists various entities (searches, providers, labels, levels) based on the options.
 * - Validates provider URNs and logs any invalid ones.
 * - Updates date ranges from the state.
 * - Cleans or purges data if specified in the options.
 * - Fetches and analyzes new messages or analyzes existing messages based on the options.
 * - Extracts invoices (facturas) if specified in the options.
 * - Lists messages if specified in the options.
 * - Saves the application state at the end of execution.
 *
 * @throws {SilentError} If invalid provider names are found.
 */

if (import.meta.main) {
  const ctx = new Strava.Ctx.Context();
  const cli = new Strava.Cmd.Root.Cmd(ctx);
  await CliApp.run<Strava.Ctx.MsgBuilder, Strava.Ctx.Logger>(ctx, () => cli.init(ctx));
}
