import * as Api from '@jpravetz/strava-api';
import type * as Ctx from './context.ts';
export { Api };

export type Activity = Api.Activity<Ctx.MsgBuilder, Ctx.Logger>;
export type StravaApi = Api.Api<Ctx.MsgBuilder, Ctx.Logger>;
