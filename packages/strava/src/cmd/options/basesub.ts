import * as Cmd from '../types.ts';
import * as Options from './mod.ts';

/**
 * An abstract base class for creating subcommands in a structured way.
 *
 * This class provides a foundation for building subcommands by handling the
 * boilerplate of command creation and the declarative addition of options and
 * arguments from a configuration object.
 */
export abstract class BaseSubCmd {
  /** The command object being built. */
  cmd: Cmd.Command;

  /**
   * Initializes a new subcommand with a name and description.
   * @param name - The name of the subcommand as it will be used on the CLI.
   * @param description - A brief description of what the subcommand does.
   */
  constructor(name: string, description: string) {
    this.cmd = new Cmd.Command({ name: name, description: description, version: '' });
  }

  /**
   * Populates the command with options and arguments from a configuration object.
   *
   * This method reads a declarative configuration and uses it to add all
   * specified command-line options and arguments to the command instance. It
   * also handles placeholder substitution in description strings.
   *
   * @param config - The configuration object that defines the options and
   * arguments for the command.
   */
  addOptions(config: Options.Config) {
    let replace: Options.ReplaceSubs = { cmd: this.cmd.name() };
    if (Options.isReplaceSubs(config.replace)) {
      replace = Object.assign(replace, config.replace);
    }
    const options: Options.OptionMap = config.options || {};
    const args: Record<string, string>[] = config.arguments || [];

    for (const optionName in options) {
      if (Options.isName(optionName)) {
        const option = new Options.Builder(optionName);
        const subs = options[optionName];
        const opts: Options.Subs = Options.isSubs(subs) ? subs : {};
        const newOption = option.getOption(opts, replace);
        this.cmd.addOption(newOption);
      }
    }

    for (const arg of args) {
      this.cmd.addArgument(new Cmd.Argument(arg.name, arg.description));
    }
  }
}
