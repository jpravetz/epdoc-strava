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
        // Delegate to app layer for business logic
        await ctx.app.getAthlete(ctx);
        
        // Display athlete information
        if (ctx.app.athlete) {
          ctx.log.info.h2('Athlete Information').emit();
          ctx.log.info.kv('Name', `${ctx.app.athlete.firstname} ${ctx.app.athlete.lastname}`).emit();
          ctx.log.info.kv('ID', ctx.app.athlete.id.toString()).emit();
          ctx.log.info.kv('City', ctx.app.athlete.city || 'Not specified').emit();
          ctx.log.info.kv('State', ctx.app.athlete.state || 'Not specified').emit();
          ctx.log.info.kv('Country', ctx.app.athlete.country || 'Not specified').emit();
          
          if (ctx.app.athlete.bikes && ctx.app.athlete.bikes.length > 0) {
            ctx.log.info.h3('Bikes').emit();
            ctx.app.athlete.bikes.forEach((bike) => {
              ctx.log.info.kv(bike.name, `${bike.brand_name} ${bike.model_name || ''} (${bike.id})`).emit();
            });
          }
        } else {
          ctx.log.warn.warn('No athlete information retrieved').emit();
        }
      } catch (err) {
        ctx.log.error.error(`Failed to retrieve athlete information: ${err.message}`).emit();
        throw err;
      }
    });
    return Promise.resolve(this.cmd);
  }
}
