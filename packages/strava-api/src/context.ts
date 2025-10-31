import type * as Log from '@epdoc/logger';
import type { Console } from '@epdoc/msgbuilder';
import type { StravaApi } from './api.ts';

/**
 * @fileoverview Defines the interfaces for the application context, including logging and services.
 */

export type MsgBuilder = Console.Builder;
export type Logger<M extends Console.Builder> = Log.Std.Logger<M>;

/**
 * Represents the basic application context, containing a logger and optional services.
 */
export interface IBare<M extends MsgBuilder, L extends Logger<M>> {
  /** The application logger. */
  log: L;
  /** Optional Google services. */
  api?: StravaApi<M, L>;
  /** Clone method for creating child contexts */
  clone?(opts?: Log.IGetChildParams): this;
}

/**
 * Represents the full application context, requiring both a logger and Google services.
 */
export interface ICtx<M extends MsgBuilder, L extends Logger<M>> extends IBare<M, L> {
  /** The Google services instance. */
  services: StravaApi<M, L>;
  /** Clone method for creating child contexts */
  clone?(opts?: Log.IGetChildParams): this;
}

/**
 * Type guard to check if a context has required Google services.
 */
// function hasStravaApi<M extends MsgBuilder, L extends Logger<M>>(
//   ctx: IBare<M, L>,
// ): ctx is ICtx<M, L> {
//   return ctx.api instanceof StravaApi;
// }
