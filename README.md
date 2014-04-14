Strava Report Generator
=======================

Overview
--------

This project contains a command line utility that will generate a single KML file that is suitable for import
into Google Earth. The utility talks directly with the Strava V3 APIs.

Installation
------------

* [Install node](http://nodejs.org/download/).
* [Install and use git](http://git-scm.com/downloads) to clone or download a zip of [this project](https://github.com/jpravetz/strava)
* Run _cd strava; npm install_ to install nodejs library dependencies
* Obtain your [Strava ID, secret and access token](https://www.strava.com/settings/api)
* Look up your Strava Athlete ID. You can find your Athlete ID by going to
your [Strava dashboard](http://www.strava.com/dashboard), and clicking on “My Profile”.
Your ID will be shown in the address bar.
* Create the file $HOME/.strava/settings.json as show below.
* Run the application with _bin/strava.js --help_

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

Notes:

* Different activity types are rendered using different colors
* There is a Strava limit of 200 activities per call, so for date ranges that include more than 200 activities, only
the first 200 activities are returned (yes I could make mulitple calls, but haven't implemented this yet).

PDF Reports
-----------

I started working on a PDF report generator, however I have barely begun this
effort and may or may not ever complete it. It is at _bin/pdfgen.js_.


Credits
-------

The stravaV3api.js file is from github, but I can't remember the source. If you know, please let me know so I can
add attribution. I found it easier to grab a copy of this source file, and then modify it as needed for this project.