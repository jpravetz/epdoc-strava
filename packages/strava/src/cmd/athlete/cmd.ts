import { Api } from '../../dep.ts';
import type { Ctx } from '../dep.ts';
import * as Options from '../options/mod.ts';
import type * as Cmd from '../types.ts';

export class AthleteCmd extends Options.BaseSubCmd {
  constructor() {
    super('athlete', 'Get athlete information.');
  }

  init(ctx: Ctx.Context): Promise<Cmd.Command> {
    this.cmd.init(ctx).action(async () => {
      await ctx.app.init(ctx, { services: true });
      const athlete = await ctx.app.api.getAthlete(ctx);
      console.log(athlete);
    });
    return Promise.resolve(this.cmd);
  }

  async getAthlete(ctx: Ctx.Context, athleteId?: Api.Schema.AthleteId): Promise<void> {
    return ctx.app.api
      .getAthlete(ctx, athleteId)
      .then((resp) => {
        const athlete = resp as Api.Schema.DetailedAthlete;
        this.registerBikes(this.athlete.bikes);
      })
      .catch((err) => {
        err.message = 'Athlete ' + err.message;
        throw err;
      });
  }

  private registerBikes(bikes: StravaBike[]) {
    if (bikes && bikes.length) {
      bikes.forEach((bike) => {
        this.bikes[bike.id] = bike;
      });
    }
  }
}
