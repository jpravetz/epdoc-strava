# Strava KML File Generator

## Overview

This project contains a command line application `bin/strava` that will generate
KML files suitable for import into Google Earth. Strava authorization will open
a browser page. The application uses the Strava V3 APIs to retrieve your
information and outputs two types of information:

- Your activities, color coded by activity type, and optionally including a
  description
- Your efforts for segments that you have [starred in
  Strava](http://blog.strava.com/keep-track-of-your-favorites-with-starred-segments-6260/),
  optionally including a description that lists all your times

## Installation

This application is written in javascript (typescript actually) for node,
requiring that you install `nodejs`, `npm`, this application and it's dependent libraries
on your computer.

- [Install node](http://nodejs.org/download/)
- [Install npm](https://www.npmjs.com/get-npm)
- [Install and use git](http://git-scm.com/downloads) to clone or download a zip of [this project](https://github.com/jpravetz/strava)
- Install nodejs library dependencies

```bash
cd strava
npm install
```

- Create the folder `$HOME/.strava` (used to store credentials)
- Optionally create a `$HOME/.strava/user.settings.json` config file as show under User Settings
- If not already compiled, compile the application (compiler output is written to the `/dist` folder)

```bash
npm run build
```

- Test that the application is working using `bin/strava --help`

```bash
strava -h

  Usage: strava [options]

  Options:

    -h, --help                 output usage information
    -V, --version              output the version number
    -d, --dates <dates>        Comma separated list of activity date or date ranges in format '20141231-20150105,20150107'. If the last entry in the list is a single date then everything from that date until today will be included.
    -i, --id <athleteId>       Athlete ID. Defaults to your login
    -u, --athlete              Show athlete details including list of bikes
    -g, --friends [opt]        Show athlete friends list (Use --more a complete summary, otherwise id and name are displayed)
    -k, --kml <file>           Create KML file for specified date range
    -x, --xml <file>           Create Acroforms XML file for specified date range, this is specific to a particular unpublished PDF form document
    -a, --activities [filter]  Output activities to kml file, optionally filtering by activity type (as defined by Strava, 'Ride', 'Hike', 'Walk', etc), plus 'commute' and 'nocommute')
    -s, --segments [opts]      Output starred segments to KML, adding efforts within date range to description if --more. Segments are grouped into folders by location unless opts is set to 'flat'.
    -m, --more                 When generating KML file, include additional detail info in KML description field
    -y, --imperial             Use imperial units
    -p, --path <cwd>           Current folder
    -v, --verbose              Verbose messages
```

Notes:

1. `bin/strava` is a `bash` script that adds the `--path` option and executes the nodejs application.
1. `bin/strava` will try to resolve the location of
   `.strava/user.settings.json` by resolving`$HOME`. `$HOME` is resolved by
   trying, in order, the ENV variables `HOME`, `HOMEPATH` and `USERPROFILE`.
1. athleteId will be automatically determined from your login (the `--id` option is ignored for now).
1. The settings file's lineStyles object allows you to customize colors for
   segments and routes. The keys in this object are Strava [Activity
   types](http://strava.github.io/api/v3/activities/), and the values include
   KML line color ('aabbggrr', alpha, blue, green, red hex values) and width.
   There are additional keys for 'Segment' and 'Commute' that are not in the
   list of Strava activity types.
1. Outputing segments (`--segments`) is currently broken

## Strava Command Line Application

The command line application can be used to query Strava and:

- Return details for an athlete
- Return your list of bikes (currently not working)
- Generate a KML file that contains activity routes for the range of dates
  and/or starred segments and corresponding segment efforts within the date
  range.

Notes:

- You will be required to authenticate by logging into your Strava account.
  - Tokens retrieved from this login are stored in`~/.strava/credentials.json`.
- Different activity types are rendered using different colors. Colors are
  defined by `lineStyle` in `user.settings.json`. The default set of colors is
  defined by `defaultLineStyles` in `lib/kml.ts`.
- There is a Strava limit of 200 activities per call, so for date ranges that
  include more than 200 activities, only the first 200 activities are returned.

### Example Command Line Use

Create a KML file that includes all activities for the first half of 2013. Add detailed descriptions to each activity.

```bash
bin/strava.js --date 20130101-20130630 --kml ~/tmp/activities.kml --activities --more
```

Create a KML file that shows all of your starred segments and lists your times for those efforts (currently not working)

```bash
bin/strava.js --date 20100101-20141231 --kml ~/tmp/activities.kml --segments --more
```

### User Settings

The user settings file is stored at `$HOME/.strava/user.settings.json`.

```json
{
  "lineStyles": {
    "Commute": { "color": "C03030C0", "width": 4 },
    "Run": { "color": "C000FF00", "width": 4 }
  }
}
```

Use this file to override default lineStyles for segments and routes. The keys
in the `lineStyles` object are Strava [Activity
types](http://strava.github.io/api/v3/activities/), and the values include KML
line color ('aabbggrr', alpha, blue, green, red hex values) and line width. This
application has added additional keys for 'Segment' and 'Commute' that are not
in the list of Strava activity types.

Defaults settings are shown below

```json
{
  "lineStyles": {
    "Default": { "color": "C00000FF", "width": 4 },
    "Ride": { "color": "C00000A0", "width": 4 },
    "Hike": { "color": "F0FF0000", "width": 4 },
    "Walk": { "color": "F0f08000", "width": 4 },
    "Sand Up Paddling": { "color": "F0f08000", "width": 4 },
    "Nordic Ski": { "color": "F0f08000", "width": 4 },
    "Commute": { "color": "C085037D", "width": 4 },
    "Segment": { "color": "C0FFFFFF", "width": 6 }
  }
}
```

### KML Description

Using _--more_ will result in a description field being added to the KML activity or segment.
For activities this will include the following fields (see notes afterwards):

```
  Distance: 45.28 km
  Total Elevation Gain: 1507 m
  Moving Time: 03:47:41
  Average Temp: 22°C
  Grizzly Flat Fire Road: 00:23:08
  Tires: Knobbies
  Description: 1 garter snake, 1 banana slug, 1 deer, lots of California Salamanders
```

Notes:

1. The Strava `description` field is parsed. Any key/value pairs, represented by
   a line containing a string of the form `Tires=Knobbies`, will result in a
   separate line being added to the description output.
2. For segments, using `--more` will add some basic information about the
   segment _and_ add an ordered list of efforts you've made for that segment
   during the specified date range.

### Description Field Processing

Entries in the form `key=value` (_e.g._ `wt=84.1kg`) that on their own line in
the Strava description field will be parsed out for use downstream. For KML files,
these will be output as part of the activity description.

## Credits

The `strava-api.ts` file is originally from [mojodna](https://github.com/mojodna/node-strav3/blob/master/index.js) and has
been modified.

## ToDo

- Handle paginated data, in other words, requests that exceed 200 activities.
- I started working on a PDF report generator, however I have barely begun this
  effort and will probably not ever complete it. It is at `bin/pdfgen.js`.
- Get `--segment` working again
- Improve authentication experience
