import * as Log from '@epdoc/logger';
// Import both CliApp and the Commander object
import type * as CliApp from '@epdoc/cliapp';
import type { Console } from '@epdoc/msgbuilder';
import { _ } from '@epdoc/type';
import pkg from '../deno.json' with { type: 'json' };
import * as App from './app/mod.ts';
import type { Api } from './dep.ts';

// deno run -A examples/basic.ts -D

export type MsgBuilder = Console.Builder;
export type Logger = Log.Std.Logger<MsgBuilder>;

const logMgr: Log.Mgr<MsgBuilder> = new Log.Mgr<MsgBuilder>().init();
logMgr.threshold = 'info';

export class Context implements CliApp.ICtx<MsgBuilder, Logger>, Api.Ctx.IContext<MsgBuilder, Logger> {
  log: Logger;
  logMgr: Log.Mgr<MsgBuilder>;
  dryRun = false;
  online = true;
  app: App.Main = new App.Main();
  pkg: CliApp.DenoPkg = _.pick<CliApp.DenoPkg>(pkg, 'name', 'description', 'version');

  constructor() {
    this.logMgr = logMgr;
    this.log = logMgr.getLogger<Logger>();
  }

  close(): Promise<void> {
    return Promise.resolve();
  }
}
