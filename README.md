# @epdoc/strava - Monorepo

This is a Deno workspace containing the Strava CLI application and its supporting packages.

## Workspaces

### `packages/strava-api/`
Strava API client library providing:
- OAuth2 authentication flow
- Type-safe API endpoints
- Schema definitions for Strava data structures
- Token management and refresh logic

### `packages/strava/`
CLI application built on `@epdoc/cliapp` providing:
- **athlete** - Display athlete information and bike list
- **kml** - Generate KML files for Google Earth with activity routes
- **pdf** - Create Acroforms XML files for PDF forms
- **segments** - Analyze starred segments with effort times

## Quick Start

```bash
# Run from workspace root
deno run -A ./packages/strava/main.ts --help

# Or use the athlete command
deno run -A ./packages/strava/main.ts athlete
```

## Development

This project is currently being converted from Node.js to Deno. See `PROGRESS.md` for current status and implementation details.

## Configuration

The CLI uses configuration files in `~/.strava/`:
- `credentials.json` - OAuth tokens from Strava
- `user.settings.json` - User preferences and customization
- `segments.json` - Cached segment data
- `clientapp.secrets.json` - Strava app client ID and secret

## Legacy Documentation

See `OLD_README.md` for the original Node.js implementation documentation.
