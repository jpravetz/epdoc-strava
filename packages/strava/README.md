# @epdoc/strava CLI

Command-line interface for managing Strava activities and generating output files for Google Earth and PDF forms.

## Installation

```bash
deno install -A -n strava ./main.ts
```

## Commands

### athlete
Display authenticated athlete information and bike list.

```bash
deno run -A main.ts athlete
```

### kml
Generate KML files for Google Earth with activity routes.

```bash
# Generate KML for date range
deno run -A main.ts kml -d 2025-01-01:2025-01-31 -o activities.kml

# Include starred segments
deno run -A main.ts kml -d 2025-01- -a -s

# Segments only with flat folder structure
deno run -A main.ts kml -d 2025-01- -s flat
```

### pdf
Generate Acroforms XML files for PDF forms (bikelog).

```bash
deno run -A main.ts pdf -d 2025-01-01:2025-01-31 -o bikelog.xml
```

### segments
Analyze starred segments with effort times.

```bash
deno run -A main.ts segments
```

## Activity Description Parsing

The CLI extracts structured data from your Strava activity descriptions and private notes when generating PDF/XML output.

### Description and Private Note Format

Activity descriptions and private notes are **merged together** and then parsed for custom properties. Lines matching the format `key=value` are extracted as custom properties, while other lines are kept as the description text.

**Example Strava Activity:**
- **Description:**
  ```
  wt=165
  This was a great ride through the hills!
  Felt strong on the climbs.
  ```
- **Private Note:**
  ```
  Check tire pressure = 35 psi
  Remember to lubricate chain
  ```

**Parsing Process:**
1. Description and private note are merged (private note prefixed with "Private: ")
2. Lines are parsed for `key=value` patterns
3. Matched lines become custom properties
4. Remaining lines become the description

**Parsed Result:**
- Custom properties:
  - `wt` = `165`
  - `Check tire pressure` = `35 psi`
- Description:
  ```
  This was a great ride through the hills!
  Felt strong on the climbs.
  Private: Remember to lubricate chain
  ```

### In PDF/XML Output

The parsed description is combined with activity metadata in the `note0` field of the bikelog XML:

```xml
<note0>Bike: Morning Ride
Moving: 1:23:45, Elapsed: 1:28:30
This was a great ride through the hills!
Felt strong on the climbs.
Private: Remember to lubricate chain</note0>
```

**Note:** Private notes are only visible to you and require fetching detailed activity data from the Strava API.

## Configuration

The CLI uses configuration files stored in `~/.strava/`:

- **credentials.json** - OAuth tokens from Strava (auto-generated)
- **user.settings.json** - User preferences including line styles for KML
- **segments.json** - Cached starred segment data
- **clientapp.secrets.json** - Your Strava app client ID and secret

### Setting Up Authentication

1. Create a Strava API application at https://www.strava.com/settings/api
2. Note your Client ID and Client Secret
3. Create `~/.strava/clientapp.secrets.json`:
   ```json
   {
     "clientId": "your_client_id",
     "clientSecret": "your_client_secret"
   }
   ```
4. Run any command - the CLI will open your browser for OAuth authentication

Alternatively, you can set environment variables:
```bash
export STRAVA_CLIENT_ID="your_client_id"
export STRAVA_CLIENT_SECRET="your_client_secret"
```

### User Settings

Create `~/.strava/user.settings.json` to customize KML line styles:

```json
{
  "lineStyles": {
    "Ride": {
      "color": "ff0000ff",
      "width": 2
    },
    "Run": {
      "color": "ff00ff00",
      "width": 2
    },
    "Commute": {
      "color": "ffff0000",
      "width": 1
    }
  }
}
```

## Global Options

- `-i, --id <athleteId>` - Specify athlete ID (defaults to authenticated user)
- `--imperial` - Use imperial units (miles, feet) instead of metric
- `--offline` - Run in offline mode
- `-n, --dry-run` - Don't modify any data
- `-v, --verbose` - Increase logging verbosity
- `--debug` - Enable debug logging

## Examples

### Generate KML for all January activities
```bash
deno run -A main.ts kml -d 2025-01- -o january.kml
```

### Generate KML for bike rides only
```bash
deno run -A main.ts kml -d 2025-01- -a Ride,EBikeRide -o rides.kml
```

### Generate PDF data with descriptions and private notes
```bash
deno run -A main.ts pdf -d 2025-01-01:2025-01-31 -o bikelog.xml
```

### Test mode (no changes)
```bash
deno run -A main.ts -n pdf -d 2025-01- -o test.xml
```

## Development

```bash
# Type check
deno check main.ts

# Lint
deno lint

# Format
deno fmt

# Run tests
deno test -A
```
