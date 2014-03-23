Strava Report Generator
=======================

Overview
--------

This project contains an application that talks directly with the Strava V3 APIs and can generate various
output formats. The application is a work in progress. It currently supports generation of KML files, suitable for
import into Google Earth. I also started working on a PDF report generator, however I have barely begun this
effort and may or may not ever complete it.

Installation
------------

* [Install node](http://nodejs.org/download/).
* [Install and use git](http://git-scm.com/downloads) to clone or download a zip of [this project](https://github.com/jpravetz/strava)
* Obtain your [Strava ID, secret and access token](https://www.strava.com/settings/api)
* Look up your Strava Athlete ID. You can find your Athlete ID by going to
your [Strava dashboard](http://www.strava.com/dashboard), and clicking on “My Profile”.
Your ID will be shown in the address bar.
* Create the file $HOME/.strava/settings.json as show here:

```
{
    "client": {
        "id": 012,
        "secret": "ab123...0f",
        "token": "123..abc"
    },
    "athleteId": 3456
}
```

Notes:
1. $HOME is resolved by trying, in order, the ENV variables HOME, HOMEPATH and USERPROFILE.
2. athleteId may alternatively be specified as a command line parameter

Applications
------------

This project contains the following applications:

* bin/strava.js - a command line application that will generate kml files from Strava
* bin/pdfgen.js - a barely-started command line application to generate PDF reports from Strava input

Strava Command Line Application
-------------------------------

```
> bin/strava.js --help

    Usage: strava.js [options]

    Options:

      -h, --help            output usage information
      -V, --version         output the version number
      -i, --id <athleteId>  Athlete ID. Defaults to value of athleteId in $HOME/.strava/settings.json
      -a, --athlete         Show athlete details
      -b, --bikes           Show list of bikes
      -d, --dates <dates>   Comma separated list of activity date or date ranges in format '20141231-20150105',20150107
      -s, --start <days>    Add activities from this many days ago (alternate way to specify date ranges)
      -e, --end <days>      End day, used with --start
      -k, --kml <file>      Create KML file for specified dates
      -f, --filter <types>  Filter based on comma-separated list of activity types (as defined by Strava, 'Ride', 'Hike', 'Walk', etc), plus 'commute' and 'nocommute'
      -v, --verbose         Verbose messages
```

This command line application can be used to query Strava and:

* Return details for an athlete
* Return your list of bikes (currently not working)
* Generate a single KML file for the range of dates

Credits
-------

The stravaV3api.js file is from github, but I can't remember the source. If you know, please let me know so I can
add attribution. I found it easier to grab a copy of this source file, and then modify it as needed for this project.