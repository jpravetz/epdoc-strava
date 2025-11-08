# Claude Code Project Guide

This document provides essential context for Claude Code when working on this project.

## Project Overview

This is a Deno/TypeScript monorepo for generating KML files from Strava activities and segments. It's a modern rewrite of the legacy Node.js implementation.

See the top-level [README.md](./README.md) for workspace structure and quick start guide.

### Repository Structure

```
/Users/jpravetz/dev/@epdoc/strava/          # NEW implementation (Deno/TypeScript)
├── packages/
│   ├── strava/                             # Main CLI application
│   └── strava-api/                         # Strava API client library
/Users/jpravetz/dev/epdoc/epdoc-strava/     # OLD implementation (Node.js)
/Users/jpravetz/dev/@epdoc/std/             # Shared utility packages (fs, type, daterange, etc.)
/Users/jpravetz/dev/@epdoc/logger/          # Logging library (separate monorepo)
```

## Key Dependencies & Their Roles

### @epdoc/logger (separate monorepo)
- **Location**: `/Users/jpravetz/dev/@epdoc/logger/`
- **Purpose**: TypeScript logging library with pluggable MessageBuilder formatting
- **Usage**: All logging throughout the application
- **Packages**: Contains multiple packages (logger, msgbuilder, loglevels, etc.)
- **Documentation**: See GEMINI.md in that repo for detailed architecture and usage
- **Published**: Available as `jsr:@epdoc/logger`

### @epdoc/cliapp
- Framework for building CLI applications
- Provides the main entry point and command structure
- Handles command parsing and routing
- **Published**: Available as `jsr:@epdoc/cliapp`

### @epdoc/std (monorepo)
- **Location**: `/Users/jpravetz/dev/@epdoc/std/`
- **Purpose**: Collection of shared utility packages
- **Documentation**: See GEMINI.md in that repo for workspace overview
- **Packages**:
  - **@epdoc/fs**: Type-safe file system operations (FileSpec, FolderSpec, FileSpecWriter)
  - **@epdoc/type**: Type guards and utilities for runtime type safety
  - **@epdoc/daterange**: Date range creation and management
  - **@epdoc/datetime**: Date/time tools
  - **@epdoc/duration**: Duration handling and formatting
  - **@epdoc/response**: Consistent API response helpers
  - **@epdoc/string**: Advanced string manipulation utilities
- **Published**: All available via `jsr:@epdoc/<package>`
- **Note**: Since you are the author, we can update these packages rather than creating workarounds

### Legacy Reference
- **Location**: `/Users/jpravetz/dev/epdoc/epdoc-strava/`
- **Purpose**: Source of truth for:
  - **Output requirements**: Types of output the new implementation must produce
  - **Option requirements**: CLI options that must be supported
  - **Feature completeness**: Reference for expected behavior
- **Usage**: Consult when implementing features to ensure compatibility

## Architecture Patterns

### Command Structure
Commands follow a consistent pattern:
1. **Command Definition**: Located in `src/cmd/<command>/cmd.ts`
2. **Options Configuration**: Shared options defined in `src/cmd/options/definitions.ts`
3. **Business Logic**: Commands call methods on `ctx.app` (like `ctx.app.getKml()`), where the actual implementation lives in `src/app/app.ts`

Example command structure:
```typescript
export const cmdConfig: Options.Config = {
  replace: { cmd: 'CommandName' },
  options: {
    output: true,
    dates: true,
    // ... other options
  },
};

export class MyCmd extends Options.BaseSubCmd {
  init(ctx: Ctx.Context): Promise<Cmd.Command> {
    this.cmd.init(ctx).action(async (opts) => {
      await ctx.app.init(ctx, { ... });
      await ctx.app.doSomething(ctx, opts);
    });
    this.addOptions(cmdConfig);
    return Promise.resolve(this.cmd);
  }
}
```

### Options System

**Two Types of Options**:
1. **Global Options** - Defined at root level, available to all commands
2. **Command-Specific Options** - Defined per command

**Global Options** (`src/cmd/root/cmd.ts`):
- `--id <athleteId>` - Athlete ID (defaults to login)
- `--imperial` - Use imperial units instead of metric
- `--offline` - Offline mode

**Command-Specific Options** (`src/cmd/options/definitions.ts`):
- **Definitions**: All option definitions are centralized in `definitions.ts`
- **Reusability**: Options like `date`, `output`, `activities`, `segments` are shared across commands
- **Configuration**: Each command specifies which options it needs via `cmdConfig.options`
- **Type Safety**: Options are strongly typed through TypeScript interfaces

**How Options Work**:
- Commander.js automatically merges parent (global) options into child command options
- Command action handlers receive both global and command-specific options in the single options parameter
- Example: KML command receives `imperial` (global) + `output`, `dates`, etc. (command-specific)

### File Writing Pattern
- Use `FileSpecWriter` from `@epdoc/fs` for file operations
- Prefer async/await over promise chains
- Always use try/catch with proper cleanup (close writers)

Example:
```typescript
const fsFile = new FS.File(FS.Folder.cwd(), filepath);
const writer = await fsFile.writer();
try {
  await writer.write(content);
  await writer.close();
} catch (err) {
  await writer.close();
  throw err;
}
```

## Development Workflow

### Making Changes to @epdoc/std Packages

When updating packages in `@epdoc/std`:
1. Make your changes
2. Run tests: `cd ~/dev/@epdoc/std/<package> && deno test -A`
3. Bump version in `deno.json`
4. Commit changes
5. Publish: `deno publish`
6. Update dependencies in dependent projects: `deno update --latest`

### Testing
- Run tests from package directory: `deno test -A`
- Type check: `deno check <file>`

## Important Notes

### Code Style
- Use async/await instead of promise chains
- Use `for...of` loops instead of `.reduce()` for async operations
- Proper error handling with try/catch blocks
- Clean up resources (close files, connections) in finally blocks

### Common Patterns
- Context (`ctx`) is passed throughout the application for dependency injection
- Options are parsed and validated at the command level
- Business logic is in the app layer, not in command handlers
- File operations use `@epdoc/fs` abstractions, not raw Deno APIs

## Current State

### Recently Completed
- Migrated KML generation to use `FileSpecWriter` with async/await patterns
- Updated `@epdoc/fs` v1.1.2 to export `Writer` from the `fs` module

### Known Issues
- Various type errors throughout the codebase (see type check output)
- Some modules reference missing types or have incomplete implementations

## Questions?

If you encounter patterns or structures not documented here, ask the user for clarification and update this document.
