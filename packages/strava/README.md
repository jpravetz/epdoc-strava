# @epdoc/strava CLI

Command-line interface for exporting Strava activities to KML (Google Earth), GPX (GPS editors like JOSM), and PDF Acroforms (bikelog forms).

## Overview

This CLI provides three main export formats for your Strava activities:

1. **KML** - Generate KML files for viewing routes in Google Earth with activity tracks, starred segments, and lap markers
2. **GPX** - Generate GPX files for GPS editors (JOSM, etc.) with track points, elevation, and lap waypoints
3. **PDF** - Generate Acroforms XML for filling out PDF bikelog forms with activity summaries and descriptions

## Installation

```bash
cd packages/strava
deno task install
```

After installation, the `strava` command will be available globally.

## Quick Start

```bash
# First time: Authenticate with Strava (opens browser)
strava athlete

# Generate KML for January activities
strava kml -d 2025-01- -o january.kml

# Generate GPX files for recent rides
strava gpx -d 2025-01- -t Ride,EBikeRide

# Generate PDF form data for the month
strava pdf -d 2025-01- -o bikelog.xml
```

## Commands

### kml - Google Earth Export

Generate KML files for visualizing activities and segments in Google Earth.

**Syntax:**
```bash
strava kml [options]
```

**Required Options:**
- `-d, --date <dates>` - Date range(s) in format `YYYYMMDD-YYYYMMDD` (e.g., `20250101-20250131` or `2025-01-`)
- `-o, --output <filename>` - Output KML filename (e.g., `activities.kml`)

**Activity Options:**
- `-t, --type [types]` - Filter by activity types: `Ride`, `Run`, `Swim`, `EBikeRide`, etc. (comma-separated)
- `--commute <choice>` - Filter by commute status: `yes`, `no`, or `all` (default: `all`)

**Content Options:**
- `-m, --more` - Include activity stats in descriptions (distance, elevation, times)
- `-e, --efforts` - Include starred segment efforts in descriptions (superset of `--more`)
- `-l, --laps [mode]` - Include lap data. Modes: `tracks` (default), `waypoints`, `both`

**Filtering Options:**
- `-b, --blackout` - Apply blackout zones from user settings (exclude sensitive locations)
- `--allow-dups` - Keep duplicate intermediate track points (don't filter)

**Examples:**
```bash
# Basic KML with activities for January
strava kml -d 2025-01- -o january.kml

# KML with activities and starred segments, including lap waypoints
strava kml -d 2025-01- -o rides.kml -l waypoints -e

# Rides only with blackout zones applied
strava kml -d 20250101-20250131 -t Ride,EBikeRide -b -o rides-filtered.kml

# Non-commute activities with lap markers and segment efforts
strava kml -d 2025-01- --commute no -l both -e -o activities.kml
```

---

### gpx - GPS Exchange Format Export

Generate individual GPX files for each activity, suitable for GPS editors like JOSM and OpenStreetMap editing.

**Syntax:**
```bash
strava gpx [options]
```

**Required Options:**
- `-d, --date <dates>` - Date range(s) in format `YYYYMMDD-YYYYMMDD`
- `-o, --output <folder>` - Output folder path (or use `gpxFolder` in user settings)

**Activity Options:**
- `-t, --type [types]` - Filter by activity types (comma-separated)
- `--commute <choice>` - Filter by commute status: `yes`, `no`, or `all`

**Content Options:**
- `-l, --laps [mode]` - Include lap data. Modes: `tracks` (default), `waypoints`, `both`

**Filtering Options:**
- `-b, --blackout` - Apply blackout zones to exclude sensitive locations
- `--allow-dups` - Keep duplicate intermediate track points

**Output:**
Each activity generates a separate GPX file named: `YYYYMMDD_Activity_Name.gpx`

**Examples:**
```bash
# Generate GPX files in ~/gpx folder for November rides
strava gpx -d 2025-11- -o ~/gpx -t Ride,EBikeRide

# GPX with lap waypoints and blackout filtering
strava gpx -d 20251101-20251130 -o ./rides/ -l waypoints -b

# All activities with default folder from user settings
strava gpx -d 2025-11-
```

**Lap Waypoints:**
When `-l waypoints` or `-l both` is specified, lap button presses are exported as GPX waypoints with:
- Name: `Lap X (distance)`
- Description: Distance for that lap (e.g., "0.27 km")
- Comment: Distance, elevation, elevation delta, gradient percentage
- Timezone-aware timestamps

---

### pdf - PDF Acroforms Export

Generate Adobe Acroforms XML files for filling out PDF bikelog forms.

**Syntax:**
```bash
strava pdf [options]
```

**Required Options:**
- `-d, --date <dates>` - Date range(s) for activities to include
- `-o, --output <filename>` - Output XML filename (e.g., `bikelog.xml`)

**Output Format:**
The XML file contains daily activity summaries with:
- Activity date, distance, elevation gain
- Bike name and gear information
- Moving time and elapsed time
- Activity descriptions and private notes (merged)
- Custom properties extracted from descriptions (key=value format)
- Weight data (automatically extracted from `wt=` or `weight=` in description)

**Examples:**
```bash
# Generate bikelog XML for January
strava pdf -d 2025-01- -o january-bikelog.xml

# Specific date range
strava pdf -d 20250101-20250131 -o bikelog.xml
```

**Activity Description Parsing:**

Activity descriptions and private notes are merged and parsed for custom properties:

```
wt=165
This was a great ride!
```

Becomes:
- Custom property: `wt = 165` (automatically placed in `<wt>` field)
- Description: "This was a great ride!"

Any line matching `key=value` format is extracted as a custom property.

---

## Configuration

Configuration files are stored in `~/.strava/`:

### Authentication Setup

**Option 1: Configuration File (Recommended)**

Create `~/.strava/clientapp.secrets.json`:
```json
{
  "clientId": "your_client_id",
  "clientSecret": "your_client_secret"
}
```

**Option 2: Environment Variables**
```bash
export STRAVA_CLIENT_ID="your_client_id"
export STRAVA_CLIENT_SECRET="your_client_secret"
```

**Initial Setup:**
1. Create a Strava API application at https://www.strava.com/settings/api
2. Note your Client ID and Client Secret
3. Set up credentials using Option 1 or Option 2 above
4. Run any command - the CLI will open your browser for OAuth authentication
5. Credentials are automatically saved to `~/.strava/credentials.json`

### User Settings

Create `~/.strava/user.settings.json` to configure defaults and preferences:

```json
{
  "gpxFolder": "/Users/username/Documents/gpx",
  "lineStyles": {
    "Ride": {
      "color": "ff0000ff",
      "width": 2
    },
    "Run": {
      "color": "ff00ff00",
      "width": 2
    },
    "EBikeRide": {
      "color": "ffff00ff",
      "width": 2
    },
    "Commute": {
      "color": "ffff0000",
      "width": 1
    }
  },
  "blackout": [
    [[37.7749, -122.4194], [37.7849, -122.4094]],
    [[37.8049, -122.4294], [37.8149, -122.4194]]
  ],
  "segments": {
    "12345678": "Hawk Hill Climb",
    "87654321": "Golden Gate Bridge"
  }
}
```

**Configuration Options:**

- **`gpxFolder`** - Default output folder for GPX files (makes `-o` optional for `gpx` command)
- **`lineStyles`** - KML line colors and widths for different activity types
  - Color format: 8-character hex (AABBGGRR - alpha, blue, green, red)
  - Width: Line width in pixels
  - Activity types: `Ride`, `Run`, `Swim`, `EBikeRide`, `Walk`, `Hike`, etc.
  - Special types: `Commute`, `Moto`, `Segment`, `Default`
- **`blackout`** - Array of rectangular regions to exclude from exports (lat/lng coordinates)
  - Format: `[[lat1, lng1], [lat2, lng2]]` (two opposite corners)
  - Used with `-b` or `--blackout` flag
  - Useful for hiding home/work locations in public GPX/KML files
- **`segments`** - Segment name aliases (segment ID → custom name)

### Configuration Files Reference

- **`~/.strava/credentials.json`** - OAuth tokens (auto-generated, do not edit)
- **`~/.strava/clientapp.secrets.json`** - Your Strava API credentials
- **`~/.strava/user.settings.json`** - User preferences and defaults
- **`~/.strava/user.segments.json`** - Cached starred segment data

## Global Options

These options work with all commands:

- `-i, --id <athleteId>` - Specify athlete ID (defaults to authenticated user)
- `--imperial` - Use imperial units (miles, feet) instead of metric
- `--offline` - Run in offline mode (use cached data only)
- `-n, --dry-run` - Don't modify any data (test mode)
- `-v, --verbose` - Increase logging verbosity
- `--debug` - Enable debug logging

## Additional Commands

### athlete - Display Athlete Info

Display authenticated athlete information and bike list.

```bash
strava athlete
```

### segments - Analyze Segments

Display starred segments with effort data and statistics.

```bash
strava segments [--refresh] [--kml <filename>]
```

Options:
- `--refresh` - Refresh segment cache from Strava API
- `--kml <filename>` - Generate KML file of all starred segments

## Examples

### KML Export Scenarios

```bash
# Complete KML with everything
strava kml -d 2025-01- -o complete.kml -l both -e -b

# Training rides only, no commutes
strava kml -d 2025-01- --commute no -t Ride -o training.kml

# Segments visualization only
strava segments --kml segments.kml
```

### GPX Export Scenarios

```bash
# Export for JOSM editing (with blackout zones)
strava gpx -d 20251114 -o ~/josm/ -b

# Multiple activity types with lap waypoints
strava gpx -d 2025-11- -t Ride,Run,Hike -l waypoints

# Use default folder from settings
strava gpx -d 2025-11-14
```

### Combined Workflow

```bash
# Monthly workflow: Generate all three formats
strava kml -d 2025-01- -o jan-earth.kml -l both -e
strava gpx -d 2025-01- -o ~/gpx/jan/ -b -l waypoints
strava pdf -d 2025-01- -o jan-bikelog.xml
```

## Privacy and Blackout Zones

The blackout zones feature allows you to exclude sensitive locations (home, work) from exported files:

1. Define rectangular regions in `user.settings.json`:
```json
{
  "blackout": [
    [[37.7749, -122.4194], [37.7849, -122.4094]]
  ]
}
```

2. Use `-b` or `--blackout` flag when exporting:
```bash
strava gpx -d 2025-11- -b -o ~/public-gpx/
strava kml -d 2025-11- -b -o public.kml
```

Track points within blackout rectangles are completely removed from the output.

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

## Troubleshooting

**Authentication Issues:**
- Delete `~/.strava/credentials.json` and re-authenticate
- Verify your API application settings at https://www.strava.com/settings/api
- Check that redirect URI includes `http://localhost:3000/token`

**Rate Limiting:**
Strava API limits:
- 100 requests per 15 minutes
- 1,000 requests per day
- The CLI automatically handles rate limits by pausing when limits are hit

**Missing Track Points:**
- Some activity types (Workout, Yoga, Weight Training) don't have GPS data
- Use `--debug` to see which activities are skipped

## License

MIT
