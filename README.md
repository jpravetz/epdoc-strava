# Strava Querying Library and KML File Generator

## Overview

Written in TypeScript. Compiled to a command line tool and a library that can be
loaded by any javascriopt application. 

A Strava querying library and also a command line application `bin/strava` that
uses this library. Uses [Strava V3 APIs](https://developers.strava.com). Can
output raw `json` query results. Can also generate `KML` files suitable for
import into Google Earth. 

There is support for Strava OAUTH authorization. Authorization may require that
a browser page is opened, but, lucky for you, this is handled by the library. 

Can output the following types of Strava information:

- Your activities as JSON or KML. If KML then paths are color coded by activity
  type, and optionally include a description and [starred
  segment](<(http://blog.strava.com/keep-track-of-your-favorites-with-starred-segments-6260/)>)
  times
- Your efforts, as JSON or KML, for segments that you have [starred in
  Strava](http://blog.strava.com/keep-track-of-your-favorites-with-starred-segments-6260/),
  optionally including a description that lists all your times (__NOT WORKING__)

## Installation

### Command Line Application

This package is written for nodejs in [typescript](http://typescript.org) for node,
requiring that you install `nodejs`, `npm`, this application, and it's dependent libraries
on your computer. 

- [Install node](http://nodejs.org/download/)
- [Install npm](https://www.npmjs.com/get-npm)
- [Install and use git](http://git-scm.com/downloads)
- Clone or download a zip of [this project](https://github.com/jpravetz/strava)
  and install it's nodejs library dependencies

```bash
cd $HOME/dev      # for example
git clone https://github.com/jpravetz/epdoc-strava.git
cd strava
npm install
```


- Create the folder `$HOME/.strava`. It is recommended that this folder be used to store `client.json`, `session.token.json` and `segments.json`.
- Optionally create a `$HOME/.strava/user.settings.json` config file as show under Project and User Settings
- If not already compiled, compile the application (compiler output is written to the `/dist` folder)

```bash
npm run build
```

- Test that the application is working using command line `bin/strava --help`

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

1. `$HOME` is resolved by trying, in order, the `ENV` variables: `HOME`, `HOMEPATH`
   and `USERPROFILE`.
1. `bin/strava` is a `bash` script that adds the `--path` option and executes the nodejs application.
1. `athleteId` will be automatically determined from your authentication (the `--id` option is ignored for now).
1. Output of starred segments (`--segments`) is currently broken

### Usage

The command line application can be used to query Strava and:

- Return details for an athlete (`--athlete`)
- Return your list of bikes (currently not working)
- Refresh your list of starred segments (`--refresh`)
- Generate a KML file that contains activity routes for the range of dates
  and/or starred segments and corresponding segment efforts within the date
  range (`-a -m --kml myfile.kml -d 20191015`)

Notes:

- You will be required to authenticate by logging into your Strava account.
  - Tokens retrieved from this login are stored in`~/.strava/session.tokens.json`.
- There is a Strava limit of 200 activities per call, so for date ranges that
  include more than 200 activities, only the first 200 activities are returned.

### Examples

Create a KML file that includes all activities for the first half of 2013. Add detailed descriptions to each activity.

```bash
bin/strava.js --date 20130101-20130630 --kml ~/tmp/activities.kml --activities --more
```

Create a KML file that shows all of your starred segments and lists your times for those efforts (currently not working)

```bash
bin/strava.js --date 20100101-20141231 --kml ~/tmp/activities.kml --segments --more
```

## Strava Library

If you are using this package as a library, add this library as usual:

```
npm install epdoc-strava
```

Setup your strava application secret file:

- Create the folder `$HOME/.strava`. It is recommended that this folder be used to store `client.json`, `session.token.json` and `segments.json`.
- Optionally create a `$HOME/.strava/user.settings.json` config file as show under Project and User Settings
- Retrieve your Strava application credentials as descibed further below.

Within your application, it is easiest to define `MainOpts` and to call
`Main.run()`. You may also wish to directly replicate the function of `Main`.

The file [cli.ts](https://github.com/jpravetz/strava/blob/master/src/cli.ts)
is an example of an application that uses Main.

## Project and User Settings

Default project settings are stored in
[src/config/project.settings.json](https://github.com/jpravetz/strava/blob/master/src/config/project.settings.json).

```json
{
  "description": "Strava project settings. Can be overriden by userSettings",
  "client": "{HOME}/.strava/client.json",
  "credentials": "{HOME}/.strava/credentials.json",
  "userSettings": "{HOME}/.strava/user.settings.json",
  "segments": "{HOME}/.strava/segments.json",
  "cachePath": "{HOME}/.strava/cache",
  "lineStyles": {
    "Commute": { "color": "C000A3FF", "width": 4 }
  }
}
```

From the above you can see there is an entry for `userSettings`. This property's
value is the full path to settings that can be used to override the values in
[project.settings.json](https://github.com/jpravetz/strava/blob/master/src/config/project.settings.json).

Any appearance of {HOME} in these two settings files will be replaced with the full path to your HOME folder. 

Properties of the project and user settings files: 

 * `description` (optional) A description of your file so you remember what it is when you get old and gray
 * `client` (required) The full path to a `client.json` credentials file. You supply this file. See below for syntax.
 * `credentails` (required) The full path to a credentials file, containing Strava
   auth tokens. This file is generated by this library.
 * `userSettings` (optional) A full path to the settings file that overrides the settings in the project settings file.
 * `segments` (optional) The full path to where segments can be cached. This file is generated by this project.
 * `cachePath` (optional) TBD
 * `lineStyles` (optional) See above
 * `aliases` (optional) A dictionary of aliases for Strava segments. 
   * Keys are segment
   names used by Strava. 
   * Values are the names you wish to substitute.
 * `bikes` (optional) An array of names for your bicycles.  Each entry in the
   array is an object with properties `pattern` and `name`.
   * `pattern` - the name or partial name used by Strava
   * `name` - the name you wish to use in your output files

You must provide a `client.json` file containing your application credentials from
Strava. Example `client.json` file:

```json
{
  "description": "Strava client app identifier and secret. Do not make public.",
  "client": {
    "id": 269,
    "secret": "40-character long secret provided by strava"
  }
}
```

An example `user.settings.json` file containing typical overrides:

```json
{
  "description": "Strava user settings",
  "lineStyles": {
    "Commute": { "color": "C000A3FF", "width": 4 }
  },
  "aliases": {
    "JNichols": "John Nicholas Trail",
    "Moody - New \"Official\"": "Moody",
    "Gibraltar Climb": "Gibraltar Road - El Cielito to Camino Cielo",
    "El Cielito Rd/Gibraltar to 1st No Shooting Sign": "Gibraltar Road - El Cielito to 1st No Shooting Sign",
    "Bella Vista Trail to Montebello Rd": "Bella Vista Trail",
  },
  "bikes": [
    {
      "pattern": "Highball1",
      "name": "HB1"
    },
      {
      "name": "HB2",
      "pattern": "Highball2"
    },
    {
      "name": "TB",
      "pattern": "Tallboy"
    },
    {
      "name": "Other",
      "pattern": "zOther"
    }
  ]
}
```

### LineStyles (KML)

`lineStyles` defines the KML colors used for different activities (_e.g._
`Ride`, `Hike`, etc.), commutes and segments. The keys in the `lineStyles`
object are the full activity name , and the values include KML line color
(`aabbggrr`, alpha, blue, green, red hex values) and line width.

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

### KML Description

Using `--more` will result in a description field being added to the KML activity or segment.
For activities this will include the following fields (see notes afterwards):

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

The
[strava-api.ts](https://github.com/jpravetz/strava/blob/master/src/strava-api.ts)
file is munged from an original implementation at
[mojodna](https://github.com/mojodna/node-strav3/blob/master/index.js).

## ToDo

- Handle paginated data, in other words, requests that exceed 200 activities.
  - Done for starred segments
- Get `--segment` working again
- Fix authorization experience so tokens are held for longer
- Write at least some jest unit tests
