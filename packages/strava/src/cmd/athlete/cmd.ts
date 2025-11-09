import type { Ctx } from '../dep.ts';
import * as Options from '../options/mod.ts';
import type * as Cmd from '../types.ts';

/**
 * Command to retrieve and display athlete information from Strava API.
 *
 * This command fetches and displays the logged-in athlete's profile information including:
 * - Name, ID, location (city, state, country)
 * - List of bikes with IDs
 * - User-configured bike display names (if defined in user settings)
 *
 * The command follows the established pattern of delegating business logic to the app layer
 * (ctx.app.getAthlete) while handling only the CLI presentation concerns.
 *
 * @example
 * ```bash
 * # From workspace root
 * deno run -A ./packages/strava/main.ts athlete
 * ```
 */
export class AthleteCmd extends Options.BaseSubCmd {
  constructor() {
    super('athlete', 'Get athlete information.');
  }

  /**
   * Initializes the athlete command with its action handler and options.
   *
   * Sets up the command action that:
   * 1. Initializes the app with Strava API and user settings
   * 2. Fetches athlete data via ctx.app.getAthlete()
   * 3. Formats and displays athlete information with proper indentation
   * 4. Shows bike list with user-configured display names
   *
   * @param ctx Application context with logging and app instance
   * @returns Promise resolving to the configured command instance
   */
  init(ctx: Ctx.Context): Promise<Cmd.Command> {
    this.cmd.init(ctx).action(async () => {
      try {
        // Initialize only what we need for this command
        await ctx.app.init(ctx, { strava: true, userSettings: true });

        // Delegate to app layer for business logic
        await ctx.app.getAthlete(ctx);

        // Display athlete information
        if (ctx.app.athlete) {
          ctx.log.info.section('Athlete Information').emit();
          ctx.log.indent();
          const athleteInfo = [
            { label: 'Name:', value: `${ctx.app.athlete.firstname} ${ctx.app.athlete.lastname}` },
            { label: 'ID:', value: String(ctx.app.athlete.id) },
            { label: 'City:', value: ctx.app.athlete.city || 'Not specified' },
            { label: 'State:', value: ctx.app.athlete.state || 'Not specified' },
            { label: 'Country:', value: ctx.app.athlete.country || 'Not specified' },
          ];

          const maxLabelLength = athleteInfo.reduce((max, item) => Math.max(max, item.label.length), 0);

          athleteInfo.forEach((item) => {
            ctx.log.info.label(item.label.padEnd(maxLabelLength)).value(item.value).emit();
          });

          if (ctx.app.athlete.bikes && ctx.app.athlete.bikes.length > 0) {
            ctx.log.info.h3('Bikes:').emit();
            ctx.log.indent();
            const userBikes = ctx.app.userSettings?.bikes;
            const bikeInfo = ctx.app.athlete.bikes.map((bike) => {
              const userBike = userBikes?.find((b) => b.pattern === bike.name);
              return {
                label: bike.name + ':',
                id: String(bike.id),
                userBikeName: userBike?.name || '',
              };
            });

            const maxBikeLabelLength = bikeInfo.reduce((max, item) => Math.max(max, item.label.length), 0);
            const maxBikeIdLength = bikeInfo.reduce((max, item) => Math.max(max, item.id.length), 0);

            bikeInfo.forEach((item) => {
              ctx.log.info
                .label(item.label.padEnd(maxBikeLabelLength))
                .value(item.id.padEnd(maxBikeIdLength))
                .h3(item.userBikeName)
                .emit();
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
