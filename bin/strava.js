#!/usr/bin/env node
/*************************************************************************
 * Copyright(c) 2012-2014 Jim Pravetz <jpravetz@epdoc.com>
 * May be freely distributed under the MIT license.
 **************************************************************************/

var env = process.env['NODE_ENV'] || 'development';

var Path = require('path');
var fs = require('fs');
var program = require('commander');
var _ = require('underscore');
var dateutil = require('dateutil');
var Main = require('../lib/main');

var DAY = 24 * 3600 * 1000;

var version = require('../package.json').version;
// var root = Path.resolve(__dirname, '..');
var home = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;

//var Config = require('a5config').init(env, [__dirname + '/../config/project.settings.json'], {excludeGlobals: true});
//var config = Config.get();

var segmentsFile = Path.resolve(home, ".strava", "segments.json");
var configFile = Path.resolve(home, ".strava", "settings.json");
if( !fs.existsSync(configFile) ) {
    console.log("Error: config file does not exist: %s", configFile);
    process.exit(1);
}
var config = require(configFile);

var segments;
if( fs.existsSync(segmentsFile) ) {
    segments = require(segmentsFile);
}


program
    .version(version)
    .option('-i, --id <athleteId>', "Athlete ID. Defaults to value of athleteId in $HOME/.strava/settings.json (this value is " + config.athleteId + ")")
    .option('-u, --athlete', "Show athlete details including list of bikes")
    .option('-g, --friends [opt]', "Show athlete friends list (Use --more a complete summary, otherwise id and name are displayed)")
    .option('-d, --dates <dates>', "Comma separated list of activity date or date ranges in format '20141231-20150105',20150107", dateList)
    .option('-s, --start <days>', "Add activities from this many days ago (alternate way to specify date ranges)")
    .option('-e, --end <days>', "End day, used with --start")
    .option('-k, --kml <file>', "Create KML file for specified date range")
    .option('-f, --fxml <file>', "Create Acroforms XML file for specified date range, this is specific to a particular unpublished PDF form document")
    .option('-a, --activities [filter]', "Output activities to kml file, optionally filtering by activity type (as defined by Strava, 'Ride', 'Hike', 'Walk', etc), plus 'commute' and 'nocommute')", commaList)
    //.option('-f, --filter <types>', "Filter based on comma-separated list of activity types (as defined by Strava, 'Ride', 'Hike', 'Walk', etc), plus 'commute' and 'nocommute'", commaList)
    //.option('-p, --prompt', "With --show, when adding segments, prompt user whether to include or exclude a segment.")
    .option('-s, --segments [opts]', "Output starred segments to KML, adding efforts within date range to description if --more. Segments are grouped into folders by location unless opts is set to 'flat'.")
    .option('-m, --more', "When generating KML file, include additional detail info in KML description field")
    .option('-y, --imperial', "Use imperial units")
    .option('-v, --verbose', "Verbose messages")
    .parse(process.argv);


var opts = {
    home: home,
    config: config,
    segmentsFile: segmentsFile,
    athleteId: parseInt(program.id, 10) || config.athleteId,
    athlete: program.athlete,
    bikes: program.bikes,
    friends: program.friends,
    dates: program.dates || [],     // array of date ranges, in seconds (not milliseconds)
    more: program.more,
    kml: program.kml,
    fxml: program.fxml,
    activities: program.activities,
    activityFilter: _.without(program.filter || [], 'commute', 'nocommute'),
    commuteOnly: (program.filter || []).indexOf('commute') >= 0 ? true : false,
    nonCommuteOnly: (program.filter || []).indexOf('nocommute') >= 0 ? true : false,
    imperial: program.imperial,
    segments: program.segments,          // Will be true or 'flat'
    verbose: program.verbose
};


if( program.start ) {
    var t1 = (new Date()).getTime();
    var t0 = t1 - Number(program.start) * DAY;
    if( program.end ) {
        t1 = t1 - Number(program.end) * DAY;
    }
    opts.dates.push({after: t0 / 1000, before: t1 / 1000});
}

opts.dateRanges = [];        // used for kml file
if( opts.dates && opts.dates.length ) {
    console.log("Date ranges: ");
    _.each(opts.dates, function( range ) {
        var tAfter = dateutil.toSortableString(1000 * range.after).replace(/\//g, '-');
        var tBefore = dateutil.toSortableString(1000 * range.before).replace(/\//g, '-');
        console.log("  From " + tAfter + " to " + tBefore);
        opts.dateRanges.push({after: tAfter.slice(0, 10), before: tBefore.slice(0, 10)});
    });
}

function commaList( val ) {
    return val.split(',');
}

function dateList( val ) {
    var result = [];
    var ranges = val.split(',');
    _.each(ranges, function( range ) {
        var p = range.split('-');
        var t0;
        var t1;
        try {
            if( p && p.length > 1 ) {
                t0 = dateStringToDate(p[0]);
                t1 = dateStringToDate(p[1]) + DAY;
            } else {
                t0 = dateStringToDate(range);
                t1 = t0 + DAY;
            }
        } catch( e ) {
            console.log(e.toString());
            process.exit(1);
        }
        result.push({after: t0 / 1000, before: t1 / 1000});
    });
    return result;
}

function dateStringToDate( s ) {
    var p = s.match(/^(\d{4})(\d\d)(\d\d)$/);
    if( p ) {
        return (new Date(p[1], p[2] - 1, p[3])).getTime();
    } else {
        throw new Error("Invalid date");
    }
}

var main = new Main(opts);
main.run( function(err) {
    if( err ) {
        console.log("Error: " + err.message);
    } else {
        console.log("Done");
    }
    // process.exit(0);     // don't do this else files will not be saved
});



//function promptSingleLine(str, fn) {
//    process.stdout.write(str);
//    process.stdin.setEncoding('utf8');
//    process.stdin.once('data', function (val) {
//        fn(val);
//    }).resume();
//}

