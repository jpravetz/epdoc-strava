import { _ } from '@epdoc/type';
import * as colors from '@std/fmt/colors';
import { assert } from 'node:console';
import * as Cmd from '../types.ts';
import { mapDef } from './definitions.ts';
import type * as Options from './types.ts';
import { isName, isReplaceSubs } from './utils.ts';

export class OptionBuilder {
  name: Options.Name;
  def: Options.Def;

  constructor(name: Options.Name) {
    assert(isName(name));
    this.name = name;
    this.def = mapDef[name];
  }

  get _def(): Options.Def {
    return mapDef[_.dash2camel(this.name)];
  }

  get short(): Options.Abbreviation | undefined {
    return this.def.short;
  }

  getOption(subs: Options.Subs | boolean, replacements: Options.ReplaceSubs): Cmd.Option {
    const def: Options.Def = Object.assign({}, this.def, subs);
    if (isReplaceSubs(replacements)) {
      def.description = _.msub(def.description, replacements, '${', '}');
    }
    if (def.choices && def.validateChoices === false) {
      const choices: string = `(choices: ${
        def.choices.map((choice) =>
          colors.green(typeof choice === 'string' ? choice : JSON.stringify(choice))
        ).join(', ')
      })`;
      def.description = [def.description, choices].join(' ');
    }
    const result = new Cmd.Option(this.optionString(def.params), def.description);
    if (def.defVal) {
      result.default(def.defVal);
    }
    if (def.argParser) {
      result.argParser(def.argParser);
    }
    if (def.choices && def.validateChoices !== false) {
      result.choices(def.choices);
    }
    return result;
  }

  optionString(params?: Options.Params): string {
    let result = this.short ? `-${this.short}, ` : '';
    result += '--' + this.name;
    if (params) {
      result += ' ' + params;
    }
    return result;
  }
}
