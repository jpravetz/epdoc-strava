#!/usr/bin/env -S deno run -A
/**
 * Main entry point for the Strava CLI application.
 * Uses @epdoc/cliapp framework for command structure.
 */

import * as CliApp from '@epdoc/cliapp';
import { Context } from './src/context.ts';
import * as Root from './src/cmd/root/mod.ts';

/**
 * Main CLI application class.
 */
class Cli {
  /**
   * Runs the command line interface.
   * @param ctx The command line context.
   */
  async run(ctx: Context): Promise<void> {
    const rootCmd = new Root.Cmd(ctx);
    await rootCmd.init(ctx);
  }
}

// Initialize context and run CLI
const ctx = new Context();
const app = new Cli();

// Use CliApp utility run method that adds logging and error handling
CliApp.run(ctx, () => app.run(ctx));
