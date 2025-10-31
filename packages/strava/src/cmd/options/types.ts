import type { DateRanges } from '@epdoc/daterange';
import type { FileSpec } from '@epdoc/fs';
import type { Integer, LetterChar } from '@epdoc/type';
import type { mapDef } from './definitions.ts';

export type OptionTypeMap = {
  output: FileSpec;
  date: DateRanges;
  limit: Integer;
};

export type Name = keyof typeof mapDef;
export type CliName = typeof mapDef[Name]['name']; // The CLI flag name (kebab-case)

/**
 * Substitutes data for original Options.Def
 */
export type Subs = {
  description?: string;
  defVal?: number | boolean | string | string[];
  params?: Params;
  choices?: string[];
  argParser?: (str: string) => unknown;
};

export type Abbreviation = LetterChar;
export type Params = `[${string}]` | `<${string}>`;

/**
 * Original definitions of options used across this app.
 */
export type Def = {
  short?: Abbreviation;
  name: string;
  params?: Params;
  description: string;
  argParser?: (str: string) => unknown;
  choices?: string[];
  validateChoices?: boolean;
  defVal?: number | boolean | string | string[];
};

export type ReplaceSubs = Record<string, string> & { cmd: string };

// export interface IBase {
//   short?: Abbreviation;
//   name: Name;
//   getOption: (subs: Subs) => OptionModels;
// }

// export type Map = Record<Name, IBase>;
export type OptionMap = Record<string, (boolean | Subs)>;

/**
 * The config that is defined for each command.
 * Indicates what command line options are being used.
 */
export type Config = {
  replace?: ReplaceSubs;
  options?: Record<string, (boolean | Subs)>;
  arguments?: Record<string, string>[];
};

export interface IList {
  list?: boolean | FileSpec;
}
