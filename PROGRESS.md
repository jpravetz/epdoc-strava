# Strava CLI Project - Progress

## Current Status: Deno Implementation

### Overview

Modern Deno/TypeScript implementation of the Strava CLI application for generating KML files,
analyzing segments, and creating PDF/XML reports from Strava activities.

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

## New Features

We are in the process of refactoring and adding functionality to
[strava/src/stream](/Users/jpravetz/dev/@epdoc/strava/packages/strava/src/stream) to be able to
produce GPX files as well as the KML files that we already can produce.

A first task is to modify how we deal with the returned stream data in
[strava-api/src/api.ts](/Users/jpravetz/dev/@epdoc/strava/packages/strava-api/src/api.ts). Rather
than only being able to return the raw `Coord[]` array (an array of `[number,number]`) we will now
combine all the stream data types for a point into a `CoordData` object. The types that can be
returned are defined as `StreamKeyType = typeof Consts.StreamKeys[keyof typeof Consts.StreamKeys];`
and StreamKeys can be one of

```ts
export const StreamKeys = {
  Time: 'time',
  Distance: 'distance',
  LatLng: 'latlng',
  Altitude: 'altitude',
  VelocitySmooth: 'velocity_smooth',
  Heartrate: 'heartrate',
  Cadence: 'cadence',
  Watts: 'watts',
  Temp: 'temp',
  Moving: 'moving',
  GradeSmooth: 'grade_smooth',
} as const;
```

The strava API for getting streams is at
https://developers.strava.com/docs/reference/#api-Streams-getActivityStreams and more generally you
can find their API docs at https://developers.strava.com/docs/reference/. I want our get coordinates
methods to bundle each point that is returned into a `CoordData` object (defined in
/Users/jpravetz/dev/@epdoc/strava/packages/strava-api/src/types.ts ).

The tasks you have are to:

1. Return all stream requests (no matter which streams are being requested, including our legacy
   request for just latlng) into an array of `Partial<CoordData>`. The format of the returned data
   when retrieving streams is shown by the screenshot
   https://www.dropbox.com/scl/fi/c7b5li8yf6hmjhrwocnvl/Screenshot-2025
   -11-14-at-6.09.49-PM.png?rlkey=aheq3a7mql7ukhecqwgjlp2m4&dl=0 which is available locally in
   /Users/jpravetz/Library/CloudStorage/Dropbox/Screenshots/Screenshot 2025-11-14 at 6.09.49 PM.png
2. Use ISOTzDate for all times. This will use `DateEx` from `@epdoc/datetime`, making use of it's
   ability to set the TZ of the date, where we can get the TZ from the activity's
   `"timezone" : "(GMT-08:00) America/Los_Angeles"` field. The `time` field is populated from the
   `actvity.start_date` plus seconds from the time stream.
3. Make sure our kml command continues to work, where kml produces kml files for Google Earth
   ingestion
4. To start, we will generate gpx files by using the kml command, but instead of specifying a
   path/to/file.kml as the output option, we specify a --output path/to/folder-without-an-extension.
   Then we will create a new gpx command to generate gpx via a separate path and we will add a
   userSettings file option to specify the default path where to store gpx files.
5. We will add a blackout region to the userSettings file that allows the user to specify a
   rectangle (latlng rectangle) of points to exclude from any of the commands that can produce a
   coordinate stream (ie kml and gpx commands)
6. Our primary target for gpx files is JOSM for editing of the openstreetmaps database, and uploads
   to the public database of openstreetmap.org, which is the reason for allowing a blackout area to
   be specified.
7. Find a way to use the --lap option to add waypoints or, in some other way, highlight points along
   our paths that are where laps ended. Just as how we do this with KML, we would exclude the last
   lap point which is at the end of our full path.

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

- `app.getSegments()` - Retrieves ALL starred segments from cache (optionally fetches
  coordinates/efforts)
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
