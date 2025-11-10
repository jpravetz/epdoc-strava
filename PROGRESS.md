# Strava CLI Project - Progress

## Current Status: Deno Implementation

### Overview

Modern Deno/TypeScript implementation of the Strava CLI application for generating KML files, analyzing
segments, and creating PDF/XML reports from Strava activities.

**Branch**: `feature/athlete-implementation` **Last Updated**: 2025-11-10

---

## Completed Features

### Core Infrastructure ✅

- **Project Structure**: Deno monorepo with `strava-api` and `strava` packages
- **CLI Framework**: Complete command structure using `@epdoc/cliapp` with logging
- **Authentication**: OAuth2 flow with token refresh
- **Configuration**: User settings, line styles, segment aliases from `~/.strava/`
- **Type Safety**: Full TypeScript with proper type definitions

### Commands ✅

- **`athlete`** - Display athlete information and bike list
- **`kml`** - Generate KML files with activities, segments, and lap markers
  - Activity routes color-coded by type
  - Starred segments support
  - Lap markers with `--laps` flag
  - Imperial/metric unit support
  - Commute filtering
- **`pdf`** - Generate Acroforms XML for PDF forms
- **`segments`** - Segment cache management and KML generation
  - `--refresh` - Update segment cache from Strava API
  - `--kml` - Generate KML of all starred segments

### API Package (`strava-api`) ✅

- Activity, athlete, segment, and stream endpoints
- Detailed and summary activity support
- OAuth2 authentication with refresh
- Type-safe schema definitions
- Activity class with segment effort attachment

### Recent Work (2025-11-10)

- **Segment Refactoring**: Completed major refactoring of segment handling
  - Moved segment effort logic to `Activity.attachStarredSegments()` method
  - Created `StarredSegmentDict` (SegmentId → aliased name) map pattern
  - Split `Kml.Opts` into `ActivityOpts`, `SegmentOpts`, and `CommonOpts`
  - Removed orphaned methods (`getSegmentKml`, `getAllStarredSegments`)
  - Cleaned up segments command to use unified `getKml()` method
  - Fixed 13 type errors related to Kml options
- **Documentation**: Enhanced JSDoc for `getSegments()` and `attachStarredSegments()`
- **Type Errors**: Reduced from 20 to 7 (remaining are pre-existing, unrelated to segment work)

---

## Known Issues

### 1. Effort Data Not Appearing in KML Descriptions

**Status**: Open **Severity**: Medium **Command**:
`deno run -A main.ts -SA kml -d 20251011 -m -e -o ../../tmp/Activities.kml`

**Description**: When using the `--efforts` (`-e`) flag with `--more` (`-m`), segment effort data should
appear in activity descriptions within the KML file, but it is not being included.

**Expected**: Activity descriptions should show starred segment efforts with times when `-e` flag is used.

**Notes**: The segment attachment logic was recently refactored. The data is being attached to activities via
`Activity.attachStarredSegments()`, but may not be rendered in KML output.

---

## In Progress

- **Testing**: Comprehensive test suite needs expansion
- **Documentation**: Additional JSDoc comments

---

## Technical Architecture

### File Structure

```
packages/
├── strava-api/          # Strava API client library
│   ├── src/
│   │   ├── activity/    # Activity class and types
│   │   ├── auth/        # OAuth2 authentication
│   │   ├── schema/      # Type definitions
│   │   └── api.ts       # Main API client
└── strava/              # CLI application
    ├── src/
    │   ├── app/         # Business logic (app.ts)
    │   ├── cmd/         # CLI commands
    │   ├── kml/         # KML generation
    │   ├── bikelog/     # PDF/XML generation
    │   └── segment/     # Segment processing
```

### Configuration Files

- `~/.strava/credentials.json` - OAuth tokens
- `~/.strava/clientapp.secrets.json` - Strava client credentials
- `~/.strava/user.settings.json` - User preferences (line styles, aliases, etc.)
- `~/.strava/user.segments.json` - Cached segment metadata

### Key Patterns

**Segment Handling**:

- `app.getSegments()` - Retrieves ALL starred segments from cache (optionally fetches coordinates/efforts)
- `app.attachStarredSegments()` - Filters and attaches only starred segments that appear in specific
  activities
- `Activity.attachStarredSegments()` - Attaches segment efforts to individual activity using
  StarredSegmentDict map
- Segment metadata cached locally; coordinates always fetched fresh from API

**Options Structure**:

- Commands use `@epdoc/cliapp` with option definitions in `cmd/options/definitions.ts`
- Global options (imperial, offline, athleteId) defined in root command
- Command-specific options merged with global options by Commander.js

---

## Dependencies

### Core

- **@epdoc/cliapp** - CLI framework with logging
- **@epdoc/logger** - Structured logging
- **@epdoc/fs** - File system utilities
- **@epdoc/type** - Type guards and utilities
- **@epdoc/daterange** - Date range handling
- **@epdoc/datetime** - Date/time utilities
- **@epdoc/duration** - Duration handling

### Development

- **@std/testing** - BDD testing framework
- **@std/expect** - Assertion library

---

## Command Usage

```bash
# Display athlete info
deno run -A ./packages/strava/main.ts athlete

# Generate KML with activities and segments
deno run -A main.ts kml --activities --segments --date 20251012 --output output.kml

# Generate KML with efforts in descriptions
deno run -A main.ts kml --activities --more --efforts --date 20251012

# Refresh segment cache
deno run -A main.ts segments --refresh

# Generate KML of all starred segments
deno run -A main.ts segments --kml segments.kml

# Generate PDF/XML
deno run -A main.ts pdf --date 20251012 --output bikelog.xml

# Show help
deno run -A main.ts --help
```

---

## Implementation Guidelines

Following `GEMINI_GLOBAL.md` standards:

- Use `@epdoc/*` libraries for common operations
- Use `dep.ts` files for workspace imports
- Type safety: `unknown` instead of `any`
- BDD testing with `@std/testing/bdd`
- Comprehensive JSDoc documentation
- Import Deno modules via `deno.json` imports

---

## API Reference

Using [Strava V3 APIs](https://developers.strava.com/docs/reference/)

### Strava Rate Limits

- 100 requests per 15 minutes
- 1,000 requests per day
- Coordinate fetching for many segments can quickly hit limits
