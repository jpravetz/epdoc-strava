# Progress Log for @epdoc/strava-api

## October 31, 2025

### Authentication Refactoring

**Completed:**

- **Removed `registerTokenCallback` from `api.ts`:** This method and its call in the `auth` method were
  removed. This resolved undefined references (`this.oauth2Client`, `isCredentials`) and streamlined the token
  management to rely solely on the explicit `#refreshToken` mechanism.
- **Refactored `AuthService` in `auth/service.ts`:**
  - The constructor was modified to accept a `StravaApi` instance directly, making the dependency explicit.
  - The `runAuthWebPage` and `start` methods were updated to use the injected `StravaApi` instance
    (`this.#api`).
  - The arbitrary `_.delayPromise(1000)` in the `close` method was removed for a cleaner server shutdown.
- Code review of the API for authentication to ensure it is fully implemented, and document how to bootstrap
  the API in the README file.
- Review schema files against Strava's reference page (https://developers.strava.com/docs/reference/).
