import * as CliApp from '@epdoc/cliapp';
import type { Ctx } from './dep.ts';

/**
 * Exposing these with shorter names, hopefully to make things less confusing, not more confusing.
 */
export class Option extends CliApp.Commander.Option {}
export class Argument extends CliApp.Commander.Argument {}
export class Command extends CliApp.Command<Ctx.MsgBuilder, Ctx.Logger> {}
