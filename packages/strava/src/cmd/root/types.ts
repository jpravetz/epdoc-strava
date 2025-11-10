import type * as CliApp from '@epdoc/cliapp';
import type { Api } from '../../dep.ts';

/**
 * The raw, unprocessed opts you get back from Commander after it parses it's command line
 * arguments.
 */
export type RootOpts = CliApp.Opts & {
  offline: boolean;
  dryRun: boolean;
  athleteId?: Api.Schema.AthleteId;
  imperial?: boolean;
};
