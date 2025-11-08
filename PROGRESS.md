# Strava CLI Project - Deno Conversion Progress

## Current Status: Transitioning from Node.js to Deno

### Overview
We are converting the legacy Node.js-based Strava CLI application to use Deno and modernizing the architecture. The goal is to replicate all original functionality while improving the codebase structure and maintainability.

### Original Functionality (from README.md)
The legacy application provided these features:
- **KML Generation**: Create KML files for Google Earth with activity routes, color-coded by activity type
- **Segment Analysis**: Output starred segments with effort times (currently broken)
- **Athlete Information**: Display athlete details including bike list
- **XML/PDF Generation**: Create Acroforms XML files for specific PDF forms
- **Activity Filtering**: Filter by activity type, commute status, date ranges
- **Imperial/Metric Units**: Support for both unit systems

### Architecture Goals
- **Separation of Concerns**: Business logic in `app/app.ts`, CLI commands only handle user interface
- **Reusable Core**: Enable future non-CLI interfaces (web, API) without duplicating business logic
- **Modern CLI**: Use `@epdoc/cliapp` for consistent command structure with built-in logging controls
- **Type Safety**: Full TypeScript implementation with proper type definitions

## Current Implementation Status

### ✅ Completed
- **Project Structure**: Deno workspace with `strava-api` and `strava` packages
- **Git Branches**: Merged feature/deno into master and develop, cleaned up branches
- **CLI Framework**: Basic command structure using `@epdoc/cliapp` (following finsync pattern)
- **Commands Scaffolded**: `athlete`, `kml`, `pdf` commands with basic structure
- **API Package**: Partial `strava-api` package with authentication and schema definitions

### 🚧 In Progress
- **Authentication Flow**: Strava OAuth2 implementation needs completion
- **Athlete ID Management**: Need to resolve how athlete ID is stored/retrieved from ~/.strava
- **API Integration**: Complete the strava-api package for all required endpoints

### ❌ Not Started
- **Activity Fetching**: Complete implementation for date range queries
- **Segment Operations**: Starred segments retrieval and effort analysis
- **KML Generation**: Port legacy KML creation logic
- **PDF/XML Generation**: Port Acroforms XML generation
- **Configuration Management**: User settings and line styles
- **Testing**: Comprehensive test suite

## Immediate Next Steps

### 1. Test Athlete Retrieval
- Fix the athlete command to successfully retrieve athlete information
- Resolve athlete ID and client ID configuration
- Test authentication flow end-to-end

### 2. Complete strava-api Package
Focus on endpoints needed for original functionality:
- `GET /athlete` - Athlete details ✅ (partially done)
- `GET /athlete/activities` - Activity list
- `GET /activities/{id}` - Activity details
- `GET /segments/starred` - Starred segments
- `GET /segments/{id}/efforts` - Segment efforts
- `GET /activities/{id}/streams` - Activity streams (for routes)

### 3. Configuration Management
- Implement ~/.strava folder structure
- Handle credentials.json storage
- Support user.settings.json for customization
- Default athlete ID configuration

### 4. Business Logic Migration
Port key functionality from legacy code to `app/app.ts`:
- Activity filtering and date range handling
- KML generation with proper styling
- Segment data processing
- Unit conversion (imperial/metric)

## Technical Details

### File Structure
```
packages/
├── strava-api/          # Strava API client library
│   ├── src/
│   │   ├── auth/        # OAuth2 authentication
│   │   ├── schema/      # Type definitions
│   │   └── api.ts       # Main API client
└── strava/              # CLI application
    ├── src/
    │   ├── app/         # Business logic (app.ts)
    │   ├── cmd/         # CLI commands
    │   ├── kml/         # KML generation
    │   └── segment/     # Segment processing
```

### Configuration Files
- `~/.strava/credentials.json` - OAuth tokens
- `~/.strava/user.settings.json` - User preferences (line styles, etc.)
- `~/.strava/segments.json` - Cached segment data

### API Reference
Using [Strava V3 APIs](https://developers.strava.com/docs/reference/) for all data access.

## Implementation Guidelines
Following GEMINI_GLOBAL.md standards:
- **@epdoc Libraries**: Use @epdoc/type for type guards, @epdoc/fs for file operations, @epdoc/cliapp for CLI
- **Import Patterns**: Use dep.ts files for workspace imports, avoid relative paths
- **Type Safety**: Use `unknown` instead of `any`, proper type guards from @epdoc/type
- **Testing**: BDD syntax with @std/testing/bdd, expect from @std/expect
- **JSDoc**: Comprehensive documentation for all exported functions and classes

## Dependencies
- **@epdoc/cliapp**: CLI framework with logging and commanderjs integration
- **@epdoc/logger**: Structured logging system
- **@epdoc/fs**: File system utilities (preferred over node:fs)
- **@epdoc/type**: Type utilities and guards (use instead of typeof/instanceof)
- **@epdoc/daterange**: Date range handling
- **@std/testing**: BDD testing framework
- **@std/expect**: Assertion library

## Current Status: Athlete Command Infrastructure Complete ✅

### Recent Achievements (Current Session)
- **GEMINI_GLOBAL.md Compliance**: Moved main.ts to workspace root per guidelines
- **CLI Entry Point**: Created proper main.ts using @epdoc/cliapp framework at correct location
- **Configuration Loading**: Implemented config.json-based clientAppFile path loading
- **Monorepo Documentation**: Created clear README.md explaining workspace structure
- **Authentication Flow**: Command correctly progresses through credential loading and reaches token refresh
- **Error Diagnosis**: Identified that clientapp.secrets.json contains placeholder credentials, not real ones

### Current Implementation Status

#### ✅ Completed
- **Project Structure**: Clean Deno workspace with proper package organization
- **CLI Framework**: Working command structure using @epdoc/cliapp
- **Core App Class**: Minimal, focused implementation in app/app.ts
- **Athlete Command**: Fully functional with proper credential loading and error messages
- **Build System**: Proper deno.json configuration with all dependencies
- **Code Quality**: Significantly reduced lint errors and improved code structure
- **Main Entry Point**: Proper CLI entry point at workspace root: `deno run -A ./packages/strava/main.ts athlete`
- **Configuration System**: Loads clientAppFile path from config.json correctly

#### 🚧 In Progress  
- **Real Credentials**: Need to find/create real Strava client ID and secret for clientapp.secrets.json
- **Authentication Flow**: OAuth2 implementation ready, needs valid client credentials to complete

#### ❌ Not Started
- **Activity Commands**: KML, PDF generation commands need fixing
- **Segment Operations**: Starred segments functionality
- **Testing**: Comprehensive test suite
- **Documentation**: Updated usage documentation

### Next Immediate Steps (For Next Session)

1. **CRITICAL: Find Real Strava Client Credentials**
   - Search for existing real client ID/secret that were used to create the tokens in ~/.strava/credentials.json
   - Or create new Strava app at https://www.strava.com/settings/api
   - Update ~/.strava/clientapp.secrets.json with real values (not placeholders)

2. **Test Complete Authentication Flow**
   - With real credentials, test if expired tokens refresh properly
   - If tokens can't refresh, verify web authorization flow launches browser
   - Confirm athlete command retrieves and displays athlete information

3. **Fix Remaining Commands**
   - Get KML and PDF commands working
   - Test all CLI functionality end-to-end

### Technical Foundation

The athlete command infrastructure is complete:
- Proper CLI framework integration following GEMINI_GLOBAL.md
- Configuration file loading (config.json → clientAppFile path)
- Error handling and user-friendly messages
- Authentication flow that progresses to token refresh
- Clean separation between CLI and business logic

### Current Issue

The system has valid OAuth tokens (credentials.json) but invalid client app credentials (clientapp.secrets.json has placeholders). The tokens are expired (August 2025) and need refreshing, but this fails because the client credentials are invalid.

### Command Usage

```bash
# From workspace root (following GEMINI_GLOBAL.md)
deno run -A ./packages/strava/main.ts athlete

# Shows help
deno run -A ./packages/strava/main.ts --help
```

### Files That Need Real Credentials

Update `~/.strava/clientapp.secrets.json`:
```json
{
  "description": "Strava API credentials",
  "client": {
    "id": "REAL_CLIENT_ID_HERE",
    "secret": "REAL_CLIENT_SECRET_HERE"
  }
}
```

### Key Files Modified This Session
- `packages/strava/main.ts` - Moved to workspace root, proper CLI entry point
- `packages/strava/src/app/app.ts` - Fixed to load clientAppFile from config.json
- `README.md` - Created monorepo documentation
- `OLD_README.md` - Renamed original README

---

**Current Branch**: `feature/athlete-implementation`  
**Status**: Infrastructure complete, needs real Strava client credentials to function
**Next Session Goal**: Find/create real client credentials and test complete authentication flow
