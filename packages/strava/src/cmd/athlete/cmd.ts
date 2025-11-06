import type { Ctx } from '../dep.ts';
import * as Options from '../options/mod.ts';
import type * as Cmd from '../types.ts';

/**
 * Command to retrieve and display athlete information from Strava.
 * Delegates business logic to the app layer for reusability.
 */
export class AthleteCmd extends Options.BaseSubCmd {
  constructor() {
    super('athlete', 'Get athlete information.');
  }

  /**
   * Initialize the athlete command with its action handler.
   * @param ctx - Application context
   * @returns Promise resolving to the configured command
   */
  init(ctx: Ctx.Context): Promise<Cmd.Command> {
    this.cmd.init(ctx).action(async () => {
      try {
        // Initialize only what we need for this command
        await ctx.app.init(ctx, { strava: true });

        // Delegate to app layer for business logic
        await ctx.app.getAthlete(ctx);

        // Display athlete information
        if (ctx.app.athlete) {
          ctx.log.info.section('Athlete Information').emit();
          ctx.log.indent();
          ctx.log.info.label('Name:').value(`${ctx.app.athlete.firstname} ${ctx.app.athlete.lastname}`)
            .emit();
          ctx.log.info.label('ID:').value(ctx.app.athlete.id).emit();
          ctx.log.info.label('City:').value(ctx.app.athlete.city || 'Not specified').emit();
          ctx.log.info.label('State:').value(ctx.app.athlete.state || 'Not specified').emit();
          ctx.log.info.label('Country:').value(ctx.app.athlete.country || 'Not specified').emit();

          if (ctx.app.athlete.bikes && ctx.app.athlete.bikes.length > 0) {
            ctx.log.info.h3('Bikes').emit();
            ctx.log.indent();
            ctx.app.athlete.bikes.forEach((bike) => {
              ctx.log.info.label(bike.name).value(bike.id).emit();
            });
            ctx.log.outdent();
          }
          ctx.log.outdent();
          ctx.log.info.section().emit();
        } else {
          ctx.log.warn.warn('No athlete information retrieved').emit();
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        ctx.log.error.error(`Failed to retrieve athlete information: ${errorMsg}`).emit();
        throw err;
      }
    });
    return Promise.resolve(this.cmd);
  }
}
