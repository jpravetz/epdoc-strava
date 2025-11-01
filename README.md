# Strava KML File Generator

## Status

This repository is currently being overhauled. Please come back later.

## Overview

A command line application `bin/strava` to generate KML files suitable for import into Google Earth. Strava
authorization will open a browser page. Uses [Strava V3 APIs](https://developers.strava.com). Can output two
types of information:

- Your activities, color coded by activity type, and optionally including a description and
  [starred segment]((http://blog.strava.com/keep-track-of-your-favorites-with-starred-segments-6260/)) times
- Your efforts for segments that you have
  [starred in Strava](http://blog.strava.com/keep-track-of-your-favorites-with-starred-segments-6260/),
  optionally including a description that lists all your times (**NOT WORKING** )

## Installation

This application is written for nodejs in [typescript](http://typescript.org) for node, requiring that you
install `nodejs`, `npm`, this application and it's dependent libraries on your computer.

- [Install node](http://nodejs.org/download/)
- [Install npm](https://www.npmjs.com/get-npm)
- [Install and use git](http://git-scm.com/downloads)
- Clone or download a zip of [this project](https://github.com/jpravetz/strava) and install it's nodejs
  library dependencies

```bash
cd $HOME/dev      # for example
git clone https://github.com/jpravetz/strava.git
cd strava
npm install
```

- Create the folder `$HOME/.strava` (used to store `credentials.json` and `segments.json`)
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
    -r, --refresh              Refresh list of starred segments rather than using local stored copy. Will automatically refresh from server if there is no locally stored copy.
    -a, --activities [filter]  Output activities to kml file, optionally filtering by activity type (as defined by Strava, 'Ride', 'Hike', 'Walk', etc), plus 'commute' and 'nocommute')
    -s, --segments [opts]      Output starred segments to KML, adding efforts within date range to description if --more. Segments are grouped into folders by location unless opts is set to 'flat'.
    -m, --more                 When generating KML file, include additional detail info in KML description field
    -y, --imperial             Use imperial units
    -p, --path <cwd>           Current folder
    -v, --verbose              Verbose messages
```

Notes:

1. `$HOME` is resolved by trying, in order, the `ENV` variables: `HOME`, `HOMEPATH` and `USERPROFILE`.
1. `bin/strava` is a `bash` script that adds the `--path` option and executes the nodejs application.
1. `athleteId` will be automatically determined from your authentication (the `--id` option is ignored for
   now).
1. Output of starred segments (`--segments`) is currently broken

## Strava Command Line Application

The command line application can be used to query Strava and:

- Return details for an athlete (`--athlete`)
- Return your list of bikes (currently not working)
- Refresh your list of starred segments (`--refresh`)
- Generate a KML file that contains activity routes for the range of dates and/or starred segments and
  corresponding segment efforts within the date range (`-a -m --kml myfile.kml -d 20191015`)

Notes:

- You will be required to authenticate by logging into your Strava account.
  - Tokens retrieved from this login are stored in`~/.strava/credentials.json`.
- There is a Strava limit of 200 activities per call, so for date ranges that include more than 200
  activities, only the first 200 activities are returned.

### Example Command Line Use

Create a KML file that includes all activities for the first half of 2013. Add detailed descriptions to each
activity.

```bash
bin/strava.js --date 20130101-20130630 --kml ~/tmp/activities.kml --activities --more
```

Create a KML file that shows all of your starred segments and lists your times for those efforts (currently
not working)

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

`lineStyles` defines the colors used for different activities (_e.g._ `Ride`, `Hike`, etc.), commutes and
segments.

Defaults line styles are set in `defaultLineStyles` in
[src/kml.ts](https://github.com/jpravetz/strava/blob/master/src/kml.ts) and
[src/config/project.settings.json](https://github.com/jpravetz/strava/blob/master/src/config/project.settings.json)/

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

`user.settings.json` is used to override default `lineStyles`. The keys in the `lineStyles` object are the
full activity name , and the values include KML line color (`aabbggrr`, alpha, blue, green, red hex values)
and line width.

### KML Description

Using `--more` will result in a description field being added to the KML activity or segment. For activities
this will include the following fields (see notes afterwards):

```
Distance: 45.28 km
Total Elevation Gain: 1507 m
Moving Time: 03:47:41
Average Temp: 22°C
Grizzly Flat Fire Road: 00:23:08
Tires: Knobbies
Wt: 84.5kg
Description: 1 garter snake, 1 banana slug, 1 deer, lots of California Salamanders
```

Notes:

1. The Strava `description` field is parsed. Any key/value pairs, represented by a line containing a string of
   the form `Tires=Knobbies`, will result in a separate line being added to the description output.
2. For segments, using `--more` will add some basic information about the segment _and_ add an ordered list of
   efforts you've made for that segment during the specified date range.

### Description Field Processing

Entries in the form `key=value` (_e.g._ `wt=84.1kg`) that on their own line in the Strava description field
will be parsed out for use downstream. For KML files, these will be output as part of the activity
description.

## Credits

The [strava-api.ts](https://github.com/jpravetz/strava/blob/master/src/strava-api.ts) file is munged from an
original implementation at [mojodna](https://github.com/mojodna/node-strav3/blob/master/index.js).

## ToDo

- Handle paginated data, in other words, requests that exceed 200 activities.
  - Done for starred segments
- I started working on a PDF report generator, however I have barely begun this effort and will probably not
  ever complete it. It is at `bin/pdfgen.js`.
- Get `--segment` working again
- Fix authentication experience so tokens are held for longer
