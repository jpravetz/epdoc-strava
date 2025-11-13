import type * as Log from '@epdoc/logger';
import type { Console } from '@epdoc/msgbuilder';

/**
 * @fileoverview Defines the interfaces for the application context, including logging and services.
 */

export type MsgBuilder = Console.Builder;
export type Logger<M extends MsgBuilder = MsgBuilder> = Log.Std.Logger<M>;

/**
 * Represents the application context, containing a logger.
 */
export interface IContext<M extends MsgBuilder, L extends Logger<M>> {
  /** The application logger. */
  log: L;
}

