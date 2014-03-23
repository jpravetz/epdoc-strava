#!/usr/bin/env node

var env = process.env['NODE_ENV'] || 'development';

var Path = require('path');
var fs = require('fs');
var async = require('async');
var program = require('commander');
var _u = require('underscore');
var Strava = require('../lib/stravaV3api');
var Kml = require('../lib/kml');

var DAY = 24 * 3600 * 1000;

var version = require('../package.json').version;
// var root = Path.resolve(__dirname, '..');
var home = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;

//var Config = require('a5config').init(env, [__dirname + '/../config/project.settings.json'], {excludeGlobals: true});
//var config = Config.get();

var configFile = Path.resolve( home, ".strava", "settings.json" );
if( !fs.existsSync(configFile) ) {
    console.log( "Error: config file does not exist: %s", configFile );
    process.exit(1);
}

var config = require(configFile);


program
    .version(version)
    .option('-i, --id <athleteId>', "Athlete ID. Defaults to value of athleteId in $HOME/.strava/settings.json (this value is " + config.athleteId + ")" )
    .option('-a, --athlete', "Show athlete details")
    .option('-b, --bikes', "Show list of bikes")
    .option('-d, --dates <dates>', "Comma separated list of activity date or date ranges in format '20141231-20150105',20150107", dateList)
    .option('-s, --start <days>', "Add activities from this many days ago (alternate way to specify date ranges)")
    .option('-e, --end <days>', "End day, used with --start")
    .option('-k, --kml <file>', "Create KML file for specified dates")
    .option('-f, --filter <types>', "Filter based on comma-separated list of activity types (as defined by Strava, 'Ride', 'Hike', 'Walk', etc), plus 'commute' and 'nocommute'", commaList)
    .option('-v, --verbose', "Verbose messages")
    .parse(process.argv);


var opts = {
//    start: program.start !== undefined ? parseInt(program.start, 10) : 7,
//    end: program.end !== undefined ? parseInt(program.end, 10) : 0,
    athleteId: parseInt(program.id,10) || config.athleteId,
    athlete: program.athlete,
    bikes: program.bikes,
    kml: program.kml,
    dates: program.dates || [],     // array of date ranges, in seconds (not milliseconds)
    filter: _u.without(program.filter || [], 'commute', 'nocommute'),
    commuteOnly: (program.filter || []).indexOf('commute') >= 0 ? true : false,
    nonCommuteOnly: (program.filter || []).indexOf('nocommute') >= 0 ? true : false
};

if (program.start) {
    var t1 = (new Date()).getTime();
    var t0 = t1 - parseInt(program.start, 10) * DAY;
    if (program.end) {
        t1 = t1 - parseInt(program.end, 10) * DAY;
    }
    opts.dates.push({ after: t0 / 1000, before: t1 / 1000 });
}

function commaList(val) {
    return val.split(',');
}

function dateList(val) {
    var result = [];
    var ranges = val.split(',');
    _u.each(ranges, function (range) {
        var p = range.split('-');
        var t0;
        var t1;
        if (p && p.length > 1) {
            t0 = dateStringToDate(p[0]);
            t1 = dateStringToDate(p[1]) + DAY;
        } else {
            t0 = dateStringToDate(range);
            t1 = t0 + DAY;
        }
        result.push({ after: t0 / 1000, before: t1 / 1000 });
    });
    return result;
}

function dateStringToDate(s) {
    var p = s.match(/^(\d{4})(\d\d)(\d\d)$/);
    if (p) {
        return (new Date(p[1], p[2] - 1, p[3])).getTime();
    } else {
        throw new Error("Invalid date");
    }
}


run(opts);

function run(options) {

    var strava = new Strava(config.client);

    var funcs = [];
    var activites;

    if (options.athlete) {
        funcs.push(getAthlete)
    }
    if (options.bikes) {
        funcs.push(getBikes);
    }
    if (options.dates) {
        funcs.push(getActivities);
    }
    if (options.kml) {
        funcs.push(addCoordinates);
        funcs.push(saveKml);
    } else if (options.dates && options.dates.length) {
        funcs.push(listActivities);
    }

    async.series(funcs, function (err) {
        if (err) {
            console.log("Error: %s", err.toString());
        } else {
            console.log("Done");
        }
    });

    function getAthlete(callback) {
        strava.getAthlete(options.athleteId, function (err, data) {
            console.log("Athlete: %s", JSON.stringify(data, null, '  '));
            callback(err);
        });
    }

    function getBikes(callback) {
        strava.getBikes(options.athleteId, function (err, data) {
            console.log("Bikes: %s", JSON.stringify(data, null, '  '));
            callback(err);
        });
    }

    function getActivities(callback) {
        var results = [];
        var count = 0;
        async.eachSeries(options.dates, function (range, callback) {
            var params = {
                athleteId: options.athleteId,
                per_page: 200,
                after: range.after,
                before: range.before
            };
            strava.getActivities(params, function (err, data) {
                // console.log("Data = %s", JSON.stringify(data, null, '  '));
                // callback(err, data);
                // console.log("Found %s", data.length)
                // results = results.concat(data);
                if( err ) {
                    callback(err);
                } else if( data && data.errors ) {
                    callback( new Error(JSON.stringify(data)));
                } else {
                    count += data ? data.length : 0;
                    append(data);
                    callback();
                }
            });
        }, function (err) {
            activities = _u.sortBy(results, 'start_date');
            console.log("Found total of %s activities (from %s retrieved)", activities.length, count);
            callback(err);
        });

        function append(activities) {
            _u.each(activities, function (activity) {
                if ((!options.commuteOnly && !options.nonCommuteOnly) || ( options.commuteOnly && activity.commute) || (options.nonCommuteOnly && !activity.commute)) {
                    if (options.filter.length) {
                        if (options.filter.indexOf(activity.type) >= 0) {
                            results.push(activity);
                        }
                    } else {
                        results.push(activity);
                    }
                }
            });
        }
    }

    function addCoordinates(callback) {
        console.log("Found %s activities", activities ? activities.length : 0);
        async.eachSeries(activities, function (item, callback) {
            addActivityCoordinates(item, callback);
        }, callback);

        function addActivityCoordinates(activity, callback) {
            strava.getActivityStream(activity.id, ['latlng'], {}, function (err, data) {
                if (err) {
                    callback(err);
                } else {
                    console.log("Processing coordinates for " + activity.name);
                    activity.coordinates = [];
                    _u.each(data, function (item) {
                        if (item && item.type === 'latlng' && item.data) {
                            _u.each(item.data, function (pt) {
                                activity.coordinates.push(pt);
                            });
                        }
                    });
                }
                callback(err);
            });
        }
    }

    function saveKml(callback) {
        var kml = new Kml();
        kml.outputActivities(activities, options.kml, callback);
    }

    function listActivities(callback) {
        var distance = 0;
        var elevationGain = 0;
        _u.each(activities, function (activity) {
            var t0 = activity.start_date_local.substr(0, 10);
            console.log(t0 + " - " + activity.name +
                " (distance " + Math.round(activity.distance / 10) / 100 +
                " km, elevation gain " + Math.round(activity.total_elevation_gain) + " m)");
            distance += activity.distance;
            elevationGain += activity.total_elevation_gain;
        });
        console.log("Total distance %s km, elevation gain %s m", Math.round(distance / 10) / 100, Math.round(elevationGain));
        callback();
    }

}


