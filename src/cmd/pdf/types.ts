import type * as CliApp from '@epdoc/cliapp';
import type * as App from '../../app/mod.ts';

/**
 * The raw, unprocessed opts you get back from Commander after it parses it's command line
 * arguments.
 */
export type RootOpts = CliApp.Opts & {
  profile: App.ProfileUrn;
  offline: boolean;
};
