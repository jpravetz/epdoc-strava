import * as Log from '@epdoc/logger';
// Import both CliApp and the Commander object
import type * as CliApp from '@epdoc/cliapp';
import type { Console } from '@epdoc/msgbuilder';
import type { Strava } from './dep.ts';

// deno run -A examples/basic.ts -D

export type M = Console.Builder;
export type L = Log.Std.Logger<M>;

const logMgr: Log.Mgr<M> = new Log.Mgr<M>().init();
logMgr.threshold = 'info';

export class Context implements CliApp.ICtx<M, L>, Strava.Ctx.IBare<M, L> {
  log: L;
  logMgr: Log.Mgr<M>;
  dryRun: false;

  constructor() {
    this.logMgr = logMgr;
    this.log = logMgr.getLogger<L>();
  }

  close(): Promise<void> {
    return Promise.resolve();
  }
}
