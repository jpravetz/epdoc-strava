import type { DateRanges } from '@epdoc/daterange';
import { dateEx } from '@epdoc/datetime';
import type { FileSpec, FolderSpec } from '@epdoc/fs';
import * as Log from '@epdoc/logger';
import * as MsgBuilder from '@epdoc/msgbuilder';
import { _ } from '@epdoc/type';
import os from 'node:os';
import { relative } from 'node:path';
import type { Api } from './dep.ts';

const home = os.userInfo().homedir;

export class StravaMsgBuilder extends MsgBuilder.Console.Builder {
  fs(path: string | FileSpec | FolderSpec): this {
    const s = '~/' + relative(home, _.isString(path) ? path : path.path);
    return this.path(s);
  }
  activity(activity: Api.Activity.Base): this {
    if (activity) {
      this.label('activity').value(activity.toString());
    } else {
      this.label('activity').value('undefined');
    }
    return this;
  }
  dateRange(dateRanges: DateRanges | undefined): this {
    if (dateRanges) {
      dateRanges.ranges.forEach((range) => {
        const bBefore = range.before && range.before < new Date() ? true : false;
        this.label(bBefore ? 'from' : 'after').date(
          range.after ? dateEx(range.after).format('yyyy/MM/dd HH:mm:ss') : '2000',
        );
        if (bBefore) {
          this.label('to').date(dateEx(range.before).format('yyyy/MM/dd HH:mm:ss'));
        }
      });
    }
    return this;
  }
}

// type M = MsgBuilder;
// export type Logger = Log.Std.Logger<MsgBuilder>;

export const msgBuilderFactory: MsgBuilder.FactoryMethod = (
  emitter: MsgBuilder.IEmitter,
): StravaMsgBuilder => {
  return new StravaMsgBuilder(emitter);
};

/**
 * Global log manager instance.
 */
export const logMgr: Log.Mgr<StravaMsgBuilder> = new Log.Mgr<StravaMsgBuilder>();
logMgr.msgBuilderFactory = msgBuilderFactory;
logMgr.init();
logMgr.threshold = 'info';
logMgr.show.data = true;
