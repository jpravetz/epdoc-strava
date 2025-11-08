# @epdoc/strava-api

This package provides a Deno TypeScript client for interacting with the Strava API. It handles authentication,
token management, and provides methods for accessing various Strava resources such as athlete data,
activities, and segments.

## Features

- **OAuth2 Authentication:** Implements the Strava OAuth2 authorization flow, including web-based user consent
  and token exchange.
- **Automatic Token Refresh:** Automatically refreshes access tokens using refresh tokens when they expire.
- **Credential Storage:** Persists authentication tokens to a local file (`~/.strava/credentials.json` by
  default) for seamless re-authentication.
- **API Endpoints:** Provides methods to interact with key Strava API endpoints (e.g., get athlete data,
  activities, segments).

## Prerequisites

To use this package, you must have:

1. **Strava API Application:** Register an application on the
   [Strava Developers website](https://developers.strava.com/docs/getting-started/#api-application).
2. **Client ID and Client Secret:** Obtain your application's Client ID and Client Secret from your Strava API
   application settings.
3. **Redirect URI:** Configure a Redirect URI for your application. For local development and the
   authentication flow implemented in this package, `http://localhost:3000/token` is used. Ensure this is
   added to your Strava application settings.

## Installation

(Assuming this package is part of a Deno project and managed via `deno.json` imports)

Add the package to your `deno.json` imports:

```
deno add jsr:@jpravetz/strava-api
```

```json
{
  "imports": {
    "@epdoc/strava-api": "./packages/strava-api/src/mod.ts"
  }
}
```

## Usage

Here’s a complete example of how to initialize the `StravaApi` client, authenticate, and make a simple API
call to get athlete data.

```typescript
import { Api as StravaApi } from '@jpravetz/strava-api';
import { File } from '@epdoc/fs';
import { Logger } from '@epdoc/logger';
import { ConsoleBuilder } from '@epdoc/msgbuilder';

// 1. Create a logger and a context for logging
const log = new Logger({ builder: new ConsoleBuilder() });
const ctx = { log };

// 2. Configure your Strava application credentials
// It's recommended to use environment variables for your client ID and secret.
const clientCreds = [
  { env: true },
  { path: '~/.strava/clientapp.secrets.json' },
  {
    creds: {
      id: 12345,
      secret: 'your_client_secret',
    },
  },
];

// 3. Specify the path for storing authentication tokens
const userCredsFile = new File('~/.strava/credentials.json');

// 4. Instantiate the API client
const api = new StravaApi(userCredsFile, clientCreds);

// 5. Authenticate and make API calls
try {
  // The init() method handles the entire authentication flow.
  // It will refresh existing tokens or start a web-based flow for new users.
  const isAuthenticated = await api.init(ctx);

  if (isAuthenticated) {
    console.log('Successfully authenticated with Strava.');

    // Get athlete data
    const athlete = await api.getAthlete(ctx);
    console.log(`Welcome, ${athlete.firstname} ${athlete.lastname}!`);

    // Get recent activities
    const activities = await api.getActivities(ctx, {
      athleteId: athlete.id,
      query: { per_page: 5, after: 0, before: 0 },
    });
    console.log('Your 5 most recent activities:', activities);
  } else {
    console.log('Authentication failed. Please check your credentials or grant access.');
  }
} catch (error) {
  console.error('An error occurred:', error);
}
```

### Authentication Flow

When you call `api.init(ctx)`, the client checks for existing, valid credentials in the file you specified
(e.g., `~/.strava/credentials.json`).

- If valid tokens are found, they are used for authentication.
- If the tokens are expired, the client will automatically use the refresh token to get a new access token.
- If no credentials or refresh token are available, a local web server will start on `http://localhost:3000`,
  and your default browser will open the Strava authorization page. After you grant permission, Strava
  redirects back to the local server, which captures the authorization code, exchanges it for tokens, and
  saves them to your credentials file for future use.

This process ensures a seamless authentication experience, whether it's the first time you're running the
application or you're re-authenticating after a token has expired.

## Project Structure

The project is organized as follows:

- `src/`: Contains the source code for the Strava API client.
  - `api.ts`: The main API client class.
  - `auth/`: Authentication-related code.
  - `schema/`: TypeScript interfaces for the Strava API data structures.
  - `activity/`: The `Activity` class and related types.
- `test/`: Contains tests for the API client.
- `deno.json`: The Deno configuration file, including dependencies and tasks.

## API Documentation

The source code is thoroughly documented using JSDoc. You can refer to the source code for detailed
information about the API, its methods, and its data structures.

## Contributing

Contributions are welcome! Please follow these steps to contribute:

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Make your changes and ensure that the code is properly formatted and linted.
4. Run the tests to ensure that your changes do not break anything.
5. Submit a pull request.

### Running Tests

To run the tests, use the following command:

```
deno test -A
```

### Linting

To lint the code, use the following command:

```
deno lint
```

## Schema Definitions

The JSON object schemas for data returned by the Strava API are defined in the `src/schema` directory. These
definitions are used for type safety and validation within the package.

- `/src/schema/activity.ts`
- `/src/schema/athlete.ts`
- `/src/schema/gear.ts`
- `/src/schema/photo.ts`
- `/src/schema/segment.ts`
- `/src/schema/stream.ts`
- `/src/schema/types.ts`
- `/src/schema/zones.ts`

These schemas should be reviewed against the
[official Strava API documentation](https://developers.strava.com/docs/reference/) to ensure their accuracy
and completeness.

## Extending Functionality

This package also defines classes for various Strava objects (e.g., `Activity`, `Segment`) where additional
functionality or data enrichment is expected. For instance, an `Activity` class might include methods to fetch
associated starred segments or detailed stream data, building upon the raw API responses.
