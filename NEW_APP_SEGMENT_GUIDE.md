### Segment Handling Implementation Guide for New Application

This guide outlines the intended functionality for segment processing in our
[new application](./packages/strava), structured around our command-line interface. It focuses on how segments
should be retrieved, processed, and integrated into XML and KML outputs, referencing the official Strava API
documentation.

- The command files in [./packages/strava/src/cmd](./packages/strava/src/cmd) should remain as light weight as
  possible.
- Put reusable high level code in [app.ts](./packages/strava/src/app/app.ts).
- Put segment-specific code in the [segments folder](./packages/strava/src/segment).
- Use the [Schema definitions from strava-api](./packages/strava-api/src/schema) as much as possible, except:
  - Consider creating higher level container objects when an object contains other objects that must be
    fetched separately.
    - For example, the [activity.ts](./packages/strava-api/src/activity/activity.ts) file is a wrapper for
      `Schema.SummaryActivity` because we add segments to it
- Consider whether general code that would be useful to anyone using the
  [strava-api module](./packages/strava-api) should be placed in [strava](./packages/strava) or
  [strava-api](./packages/strava-api)

Note: The [segment command](./packages/strava/src/cmd/segments/cmd.ts) and the segment-related methods in
[app.ts](./packages/strava/src/app/app.ts) are under construction and should be treated as such. This includes
the methods refreshStarredSegments, getSegments and attachStarredSegments

---

#### **1. `segments --refresh` Command**

**Purpose:** To fetch the user's starred segments from Strava and store them in a local cache. This cache will
serve as the primary source of starred segment data for other commands, reducing redundant API calls.

**Implementation Steps:**

1. **API Call:** Execute a `GET` request to the `getLoggedInAthleteStarredSegments` endpoint.
   - **Endpoint:** `/api/v3/segments/starred`
   - **Reference:**
     [Strava API Docs: getLoggedInAthleteStarredSegments](https://developers.strava.com/docs/reference/#api-Segments-getLoggedInAthleteStarredSegments)

2. **Process Response:**
   - The API will return an array of `SummarySegment` objects. Each object provides essential details about a
     segment, such as its `id`, `name`, `distance`, `average_grade`, `city`, and `state`.
   - **Data Type:** `Array<SummarySegment>`

3. **Caching:**
   - Persist the entire array of a cachable version of `SummarySegment` objects to a local JSON file (e.g.,
     `~/.strava/segments.json`). This file should be designed for easy reading and parsing by other parts of
     the application. The cachable version of the SummarySegment will use camelcase conversions of the
     SummarySegment names.

Note: It is TBD what the segments command will do when not using the --refresh command. Probably it will list
our segments. Later we may use a database and be able to extract all of our times for each segment.

---

#### **2. `xml` Command**

**Purpose:** To generate an XML file containing daily activity summaries. This XML output should include notes
detailing segment efforts that correspond to the user's starred segments within each activity, with segment
names potentially aliased.

Important Note: This is already implemented but may need to be modified as we change other aspects of dealing
with segments.

**Implementation Steps:**

1. **Load Starred Segments and Aliases:**
   - Read the local cache file (`~/.strava/segments.json`) created by the `segments --refresh` command.
   - Parse the JSON content into an array of `SummarySegment` objects.
   - For efficient lookup, create a `Set` containing only the `id` (a `number`) of each starred segment.
   - Load the user's configured segment aliases (e.g., from a configuration file). This should be a
     dictionary/map where keys are original Strava segment names and values are preferred alias names.

2. **Fetch Activities:** (existing)
   - Retrieve the user's activities for a specified date range by making a `GET` request to the
     `getLoggedInAthleteActivities` endpoint.
   - **Endpoint:** `/api/v3/athlete/activities`
   - **Reference:**
     [Strava API Docs: getLoggedInAthleteActivities](https://developers.strava.com/docs/reference/#api-Activities-getLoggedInAthleteActivities)
   - This API call returns an array of `SummaryActivity` objects.

3. **Fetch Detailed Activity Data:** (existing)
   - For each `SummaryActivity` obtained in the previous step, make a subsequent `GET` request to the
     `getActivityById` endpoint to retrieve comprehensive details, including all associated segment efforts.
   - **Endpoint:** `/api/v3/activities/{id}` (where `{id}` is the unique identifier of the activity).
   - **Reference:**
     [Strava API Docs: getActivityById](https://developers.strava.com/docs/reference/#api-Activities-getActivityById)
   - This returns a `DetailedActivity` object.

4. **Filter and Alias Segment Efforts:**
   - The `DetailedActivity` object includes a `segment_efforts` property, which is an array of
     `DetailedSegmentEffort` objects.
   - Iterate through this `segment_efforts` array.
   - **Filtering:** Retain only those efforts where the `effort.segment.id` is present in the `Set` of starred
     segment IDs created in Step 1.
   - **Aliasing:** For each retained `segment_effort`, check if its `effort.name` has an alias defined in the
     loaded aliases dictionary. If an alias exists, replace `effort.name` with the alias.

5. **Generate XML Output:**
   - For each day's entry in the XML file, construct notes that incorporate the details of the filtered and
     aliased `DetailedSegmentEffort` objects. The note for each effort should typically include the segment's
     (aliased) name and the duration of the effort (e.g., "Up Aliased Segment Name [MM:SS]").

---

#### **3. `generate-kml` Command**

**Purpose:** To generate a KML file that visually represents the GPS tracks of the user's starred segments.

Note: Align this implementation with our existing kml command line options. For example, we specify whether we
are generating activity paths or segment paths.

**Implementation Steps:**

1. **Load Starred Segments:**
   - Read the local cache file (`~/.strava/segments.json`) and parse its content into an array of
     `SummarySegment` objects.

2. **Fetch Segment Streams (GPS Tracks):**
   - For each `SummarySegment` loaded, make a `GET` request to the `getSegmentStreams` endpoint to retrieve
     its detailed GPS track data.
   - **Endpoint:** `/api/v3/segments/{id}/streams` (where `{id}` is the segment's ID).
   - **Parameters:** Include the query parameter `keys=latlng` to specifically request latitude/longitude
     data.
   - **Reference:**
     [Strava API Docs: getSegmentStreams](https://developers.strava.com/docs/reference/#api-Streams-getSegmentStreams)

3. **Process Stream Response:**
   - The API will return a `StreamSet` object. Extract the `latlng` property from this object, which is a
     `LatLngStream`.
   - The `LatLngStream` object's `data` property contains an array of `[latitude, longitude]` pairs.
   - **Data Type:** The `data` property is `Array<[Number, Number]>`.

4. **Generate KML Output:**
   - For each segment, use its `latlng` data to construct a KML `<Placemark>` element. The coordinates should
     be embedded within a `<LineString><coordinates>` block.
   - **Optional Feature:** Implement a command-line flag (e.g., `--segments-flat`) to control the KML folder
     structure. If the flag is present, all segment placemarks should be placed in a single KML `<Folder>`.
     Otherwise, group them into separate folders based on geographical attributes like `city` or `state` from
     the `SummarySegment` object.
   - **Aliasing (Optional for KML):** While not explicitly in the original app's KML generation, consider
     applying aliases to the segment names used in KML placemark titles or descriptions for consistency with
     XML output.
