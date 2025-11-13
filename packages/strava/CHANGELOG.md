# Changelog for @jpravetz/strava

All notable changes to this project will be documented in this file.

## [2.0.0-alpha.7] - 2025-11-13

- Ready to install

## [2.0.0-alpha.6] - 2025-11-13

- fixed non-awaited async call

## [2.0.0-alpha.5] - 2025-11-13

- Cleaning up generics, and making a mess

## [2.0.0-alpha.5] - 2025-11-08

### Added
- Lap marker support in KML generation with `--laps` flag
  - Displays circular markers at lap button press locations
  - Labels show "Lap 1", "Lap 2", etc. when clicked in Google Earth
  - Optimized to only fetch detailed activity data when needed
- Weight extraction from activity descriptions for PDF/XML output
  - Case-insensitive "weight" key parsing (supports "165", "165 kg", "165kg")
  - Automatically populates `<wt>` field in bikelog XML

### Changed
- Updated bikelog XML generation to merge description and private_note fields
- Description parsing now extracts key=value pairs as custom properties
- All custom property keys converted to Title Case in output
- Filter out blank lines from parsed descriptions
- Double newline separator between multiple activities on same day
- Moving/Elapsed times now appear before description text in bikelog

### Fixed
- PDF generation now fetches detailed activity data for description and private_note fields
- Description and private_note are properly merged and parsed together

## [2.0.0-alpha.4] - 2025-11-06

- Athlete retrieval is working

## [2.0.0-alpha.3] - 2025-11-02

- snapshot

## [2.0.0-alpha.2] - 2025-11-01,,- Working on loading credentials
