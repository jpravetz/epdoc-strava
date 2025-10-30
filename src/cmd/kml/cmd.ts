import type { DateRanges } from '@epdoc/daterange';
import { FileSpec } from '@epdoc/fs';
import { type Integer, jsonSerialize } from '@epdoc/type';
import * as Base from '../base/mod.ts';
import type { App, Cmd, Ctx, Msg } from '../dep.ts';
import { Kv, MsgOp } from '../dep.ts';
import type * as Options from '../options/mod.ts';

export const cmdConfig: Options.Config = {
  options: {
    archived: true,
    date: true,
    limit: true,
    dryRun: true,
    list: {
      description: 'List messages that were downloaded. Specify a filename to save messages to a file.',
      params: '[filename]',
    },
    search: true,
    assign: true,
    export: { description: 'Export PDF files of messages that could be assigned to a provider.' },
    update: {
      description: 'Update CSV files and Google Sheets of messages that could be assigned to a provider.',
    },
    refresh: {
      description:
        'Retrieve and save messages that are already downloaded (default is to only retrieve new messages).',
    },
  },
};

type FetchOpts = Options.IList & {
  archived: boolean;
  date: DateRanges;
  limit?: Integer;
  dryRun?: boolean;
  search?: string[];
  assign?: boolean;
  export?: boolean;
  update?: boolean;
  refresh?: boolean;
};

export class FetchCmd extends Base.SubCmd {
  tNow: Date | undefined;

  constructor() {
    super('fetch', 'Fetch GMail messages within the date range and store under "new".');
  }

  init(ctx: Ctx.Context): Promise<Cmd.Command> {
    this.cmd.init(ctx)
      .action(async (opts: FetchOpts) => {
        await ctx.app.init(ctx, { services: true, db: true, config: true, searches: true, gmail: true });
        await this.fetch(ctx, opts);
      });
    this.addOptions(cmdConfig);
    return Promise.resolve(this.cmd);
  }

  async fetch(ctx: Ctx.Context, opts: FetchOpts): Promise<Kv.Msg[]> {
    // This will return a manual setting or the last fetch date, if no manual setting
    const [dateRanges, manualDateRanges] = await ctx.resolveDateRanges(opts.date, Kv.Op.fetch);

    const searchOpts: App.SearchOpts = {
      archived: opts.archived,
      dateRanges: dateRanges,
      limit: opts.limit,
      search: opts.search,
      all: opts.refresh,
    };
    const tNow = new Date();
    const msgIds: Msg.Id[] = await ctx.app.search(ctx, searchOpts);

    const line = ctx.log.info.h2('There are').count(msgIds.length);
    if (opts.refresh) {
      line.h2('message').h2('to retrieve or refresh').emit();
    } else {
      line.h2('new message').h2('to retrieve').emit();
    }

    if (opts.dryRun === true) {
      const pl = msgIds.length > 1;
      ctx.log.info.h2('Would skip downloading').h2(pl ? 'these' : 'this')
        .count(msgIds.length).h2('message').h2(':').emit();
      ctx.log.indent();
      for (const msgId of msgIds) {
        ctx.log.info.value(msgId).emit();
      }
      ctx.log.outdent();
      return [];
    }

    const retrieveOpts: MsgOp.FetchOpts = {
      overwrite: opts.refresh,
      meta: true,
      bodyText: ctx.config.prefs?.retrieveBodyText || true,
      bodyHtml: ctx.config.prefs?.retrieveBodyHtml ?? false,
      attachments: true,
      docs: true,
      labels: true,
    };
    const retriever = new MsgOp.Retriever(ctx, msgIds);
    const kvMsgs = await retriever.retrieveAll(retrieveOpts);

    if (kvMsgs.length && opts.list instanceof FileSpec) {
      ctx.log.info.h1('Will save').count(msgIds.length).h1('message').h1('to').fs(opts.list)
        .emit();
      const s = jsonSerialize(kvMsgs, null, 2);
      opts.list.ensureParentDir();
      opts.list.write(s);
      return kvMsgs;
    }

    if (!opts.dryRun && !manualDateRanges) {
      ctx.db.setSetting('lastFetched', tNow);
      ctx.log.verbose.h2('Saved last fetch date:').date(tNow).emit();
    }

    if (opts.assign) {
      const assignOpts: MsgOp.AnalyzerOpts = { refreshLabels: false, dryRun: opts.dryRun, list: opts.list };
      const analyzer = new MsgOp.Analyzer(ctx);
      await analyzer.analyzeMsgs(ctx, kvMsgs, assignOpts);
    }
    ctx.log.info.section().emit();

    return kvMsgs;
  }
}
