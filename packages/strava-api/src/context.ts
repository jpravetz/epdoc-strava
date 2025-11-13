import type * as Log from '@epdoc/logger';
import type { Console } from '@epdoc/msgbuilder';

/**
 * @fileoverview Defines the interfaces for the application context, including logging and services.
 */

export type MsgBuilder = Console.Builder;
export type Logger<M extends Console.Builder> = Log.Std.Logger<M>;

// Define the default concrete types you'll use throughout your app
export type DefaultMsgBuilder = Console.Builder;
export type DefaultLogger = Log.Std.Logger<DefaultMsgBuilder>;

/**
 * Represents the application context, containing a logger.
 */
export interface ICtxGeneric<M extends MsgBuilder, L extends Logger<M>> {
  /** The application logger. */
  log: L;
}

// This is your global context type that doesn't require generics
export interface IContext extends ICtxGeneric<DefaultMsgBuilder, DefaultLogger> {}
