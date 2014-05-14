Strava KML File Generator
=======================

Overview
--------

This project contains a command line application bin/strava.js that will generate KML files suitable for import
into Google Earth. The application uses the Strava V3 APIs to retrieve your personal ride and segment effort information from Strava.

Installation
------------

bin/strava.js is a node application, written in javascript, requiring that you install nodejs, this application
and dependent libraries on your computer. You will also need to obtain your own Strava ID, secret and access token
from Strava, then add these to a JSON-encoded settings file.

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
    "athleteId": 3456,

    "lineStyles": {
        "Commute": { "color": "C03030C0", "width": 4 },
        "Run": { "color": "C000FF00", "width": 4 }
    }
}
```


Notes:

1. bin/strava.js will try to resolve the location of .strava/settings.json by resolving $HOME.
$HOME is resolved by trying, in order, the ENV variables HOME, HOMEPATH and USERPROFILE.
2. athleteId may be specified in the settings file or on the command line.
3. The settings file's lineStyles object allows you to customize colors for segments and routes. The keys in this object are
Strava [Activity types](http://strava.github.io/api/v3/activities/), and the values include KML line
color ('aabbggrr', alpha, blue, green, red hex values) and width. There are additional keys for 'Segment' and 'Commute' that
are not in the list of Strava activity types.

Strava Command Line Application
-------------------------------

```
> bin/strava.js --help

    Usage: strava.js [options]

   Options:

  Options:

    -h, --help                 output usage information
    -V, --version              output the version number
    -i, --id <athleteId>       Athlete ID. Defaults to value of athleteId in $HOME/.strava/settings.json (this value is 6355)
    -u, --athlete              Show athlete details
    -b, --bikes                Show list of bikes
    -g, --friends [opt]        Show athlete friends list (set opt to 'detailed' for a complete summary, otherwise id and name are returned)
    -d, --dates <dates>        Comma separated list of activity date or date ranges in format '20141231-20150105',20150107
    -s, --start <days>         Add activities from this many days ago (alternate way to specify date ranges)
    -e, --end <days>           End day, used with --start
    -k, --kml <file>           Create KML file for specified date range
    -a, --activities [filter]  Output activities to kml file, optionally filtering by activity type (as defined by Strava, 'Ride', 'Hike', 'Walk', etc), plus 'commute' and 'nocommute')
    -s, --segments [opts]      Output starred segments to KML, adding efforts within date range to description if --more. Segments are grouped into folders by location unless opts is set to 'flat'.
    -m, --more                 When generating KML file, include additional detail info in KML description field
    -y, --imperial             Use imperial units
    -v, --verbose              Verbose messages
```

This command line application can be used to query Strava and:

* Return details for an athlete
* Return your list of bikes (currently not working)
* Generate a KML file that contains activity routes for the range of dates and/or starred segments and corresponding
segment efforts within the date range.

Notes:

* Different activity types are rendered using different colors, using the colors defined by lineStyle in the settings file.
A default set of colors is defined in _defaultLineStyles_ in the file lib/kml.js.
* There is a Strava limit of 200 activities per call, so for date ranges that include more than 200 activities, only
the first 200 activities are returned.

### Example Command Line Use

Create a KML file for the past five days of activities. Use imperial units, and add detailed descriptions to each activity.

```
bin/strava.js --start 5 --kml ~/tmp/activities.kml --activities --more  --imperial
```

Create a KML file for 2013 that includes activities and segment efforts.Add detailed descriptions to each activity.

```
bin/strava.js --date 20130101-20131231 --kml ~/tmp/activities.kml --activities --segments --more
```

### KML Description

Using *--more* will result in a description field being added to the KML activity or segment.
For activities this will include the following fields (see notes afterwards):

  Distance: 45.28 km
  Total Elevation Gain: 1507 m
  Moving Time: 03:47:41
  Average Temp: 22°C
  Grizzly Flat Fire Road: 00:23:08
  Tires: Knobbies
  Description: 1 garter snake, 1 banana slug, 1 deer, lots of California Salamanders

Notes:

1. Segments will show the name and time, but ony for visible segments listed in your segments.json file.
2. By using the --prompt option, you will be prompted to include (y) or exclude (anything but 'y') a segment in your segment includes list.
3. The Strava *description* field is parsed. Any key/value pairs, represented by a line containing a string of the form *Tires=Knobbies* will result in a separate line being added to the description output.

For segments, using *--more* will add some basic information about the segment _and_ add an ordered list of efforts
you've made for that segment during the specified date range.


PDF Reports
-----------

I started working on a PDF report generator, however I have barely begun this
effort and may or may not ever complete it. It is at _bin/pdfgen.js_.


Credits
-------

The stravaV3api.js file is originally from [mojodna](https://github.com/mojodna/node-strav3/blob/master/index.js) and has
been modified.

ToDo
----

* Handle paginated data, in other words, requests that exceed 200 activities.
* Handle unit conversions for the less than 5% of the planet that isn't using metric.