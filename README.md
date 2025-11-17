# @epdoc/strava - Monorepo

This is a Deno workspace containing the Strava CLI application and its supporting packages.

## Workspaces

### [packages/strava-api](./packages/strava-api/README.md)

Strava API client library providing:

- OAuth2 authentication flow
- Type-safe API endpoints
- Schema definitions for Strava data structures
- Token management and refresh logic

### [packages/strava](./packages/strava/README.md)

CLI application built on
[@epdoc/cliapp](https://github.com/epdoc/logger/blob/master/packages/cliapp/README.md) providing:

- **athlete** - Display athlete information and bike list
- **kml** - Generate KML files for Google Earth with activity routes
- **pdf** - Create Acroforms XML files for PDF forms
- **segments** - Analyze starred segments with effort times

## Installation

```bash
cd ~/mydevfolder
mkdir epdoc
cd epdoc
git clone https://github.com/epdoc/strava.git
```

## Quick Start

```bash
# Run from workspace root
deno run -A ./packages/strava/main.ts --help

# Or use the athlete command
deno run -A ./packages/strava/main.ts athlete
```

See the [strava README](./packages/strava/README.md) for more information.

## Configuration

The CLI uses configuration files in `~/.strava/`:

- `credentials.json` - OAuth tokens from Strava
  ([StravaCredsData](./packages/strava-api/src/types.ts))
- `user.settings.json` - User preferences and customization
  ([UserSettings](./packages/strava/src/app/types.ts))
- `segments.json` - Cached segment data ([CacheFile](./packages/strava/src/segment/types.ts))
- `clientapp.secrets.json` - Strava app client ID and secret
  ([ClientConfig](./packages/strava-api/src/types.ts))

## Development

This project was converted from a legacy Nodejs application. See
[github.com/jpravetz/epdoc-strava](https://github.com/jpravetz/epdoc-strava) for the original
Node.js implementation documentation.
