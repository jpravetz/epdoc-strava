#!/usr/bin/env node
/*************************************************************************
 * Copyright(c) 2012-2014 Jim Pravetz <jpravetz@epdoc.com>
 * May be freely distributed under the MIT license.
 **************************************************************************/

var env = process.env['NODE_ENV'] || 'development';

var Path = require('path');
var fs = require('fs');
var async = require('async');
var program = require('commander');
var _u = require('underscore');
var Strava = require('../lib/stravaV3api');
var Kml = require('../lib/kml');
var dateutil = require('dateutil');

var DAY = 24 * 3600 * 1000;

var version = require('../package.json').version;
// var root = Path.resolve(__dirname, '..');
var home = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;

//var Config = require('a5config').init(env, [__dirname + '/../config/project.settings.json'], {excludeGlobals: true});
//var config = Config.get();

var segmentsFile = Path.resolve(home, ".strava", "segments.json");
var configFile = Path.resolve(home, ".strava", "settings.json");
if (!fs.existsSync(configFile)) {
    console.log("Error: config file does not exist: %s", configFile);
    process.exit(1);
}

var config = require(configFile);


program
    .version(version)
    .option('-i, --id <athleteId>', "Athlete ID. Defaults to value of athleteId in $HOME/.strava/settings.json (this value is " + config.athleteId + ")")
    .option('-u, --athlete', "Show athlete details")
    .option('-b, --bikes', "Show list of bikes")
    .option('-g, --friends [opt]', "Show athlete friends list (set opt to 'detailed' for a complete summary, otherwise id and name are returned)")
    .option('-d, --dates <dates>', "Comma separated list of activity date or date ranges in format '20141231-20150105',20150107", dateList)
    .option('-s, --start <days>', "Add activities from this many days ago (alternate way to specify date ranges)")
    .option('-e, --end <days>', "End day, used with --start")
    .option('-k, --kml <file>', "Create KML file for specified date range")
    .option('-a, --activities [filter]', "Output activities to kml file, optionally filtering by activity type (as defined by Strava, 'Ride', 'Hike', 'Walk', etc), plus 'commute' and 'nocommute')", commaList)
    //.option('-f, --filter <types>', "Filter based on comma-separated list of activity types (as defined by Strava, 'Ride', 'Hike', 'Walk', etc), plus 'commute' and 'nocommute'", commaList)
    //.option('-p, --prompt', "With --show, when adding segments, prompt user whether to include or exclude a segment.")
    .option('-s, --segments', "Output starred segments to KML, adding efforts within date range to description if --more.")
    .option('-m, --more', "When generating KML file, include additional detail info in KML description field")
    .option('-v, --verbose', "Verbose messages")
    .parse(process.argv);


var opts = {
//    start: program.start !== undefined ? parseInt(program.start, 10) : 7,
//    end: program.end !== undefined ? parseInt(program.end, 10) : 0,
    athleteId: parseInt(program.id, 10) || config.athleteId,
    athlete: program.athlete,
    bikes: program.bikes,
    friends: program.friends,
    dates: program.dates || [],     // array of date ranges, in seconds (not milliseconds)
    more: program.more,
    kml: program.kml,
    activities: program.activities,
    activityFilter: _u.without(program.filter || [], 'commute', 'nocommute'),
    commuteOnly: (program.filter || []).indexOf('commute') >= 0 ? true : false,
    nonCommuteOnly: (program.filter || []).indexOf('nocommute') >= 0 ? true : false,
    segments: program.segments
};

if (program.start) {
    var t1 = (new Date()).getTime();
    var t0 = t1 - parseInt(program.start, 10) * DAY;
    if (program.end) {
        t1 = t1 - parseInt(program.end, 10) * DAY;
    }
    opts.dates.push({ after: t0 / 1000, before: t1 / 1000 });
}

var dateRanges = [];        // used for kml file
console.log("Date ranges: ");
_u.each(opts.dates, function (range) {
    var tAfter = dateutil.toSortableString(1000 * range.after).replace(/\//g, '-');
    var tBefore = dateutil.toSortableString(1000 * range.before).replace(/\//g, '-');
    console.log("  after: " + tAfter + ", before: " + tBefore);
    dateRanges.push({ after: tAfter.slice(0,10), before: tBefore.slice(0,10) });
});

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
        try {
            if (p && p.length > 1) {
                t0 = dateStringToDate(p[0]);
                t1 = dateStringToDate(p[1]) + DAY;
            } else {
                t0 = dateStringToDate(range);
                t1 = t0 + DAY;
            }
        } catch (e) {
            console.log(e.toString());
            process.exit(1);
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
    var kml;

    if (options.kml) {
        // Run this first to validate line styles before pinging strava APIs
        kml = new Kml();
        if (config.lineStyles) {
            kml.setLineStyles(config.lineStyles);
        }
    }

    var funcs = [];
    var global = {
        activities: [],
        segments: []
    };

    if (options.athlete) {
        funcs.push(getAthlete)
    }
    if (options.bikes) {
        funcs.push(getBikes);
    }
    if (options.friends) {
        funcs.push(getFriends);
    }
    if (options.activities) {
        funcs.push(getActivities);
    }
    if (options.segments) {
        funcs.push(getStarredSegments);
    }
    if (options.more && options.activities) {
        funcs.push(addActivitiesDetails);
    }
    if (options.kml) {
        if (options.activities) {
            funcs.push(addActivitiesCoordinates);
        }
        if (options.segments) {
            funcs.push(addSegmentsCoordinates);
        }
        funcs.push(saveKml);
    } else if (options.dates && options.dates.length) {
        funcs.push(listActivities);
    }

    async.series(funcs, function (err) {
        if (err) {
            console.error(err);
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

    function getFriends(callback) {
        strava.getFriends({athleteId: options.athleteId, level: options.friends}, function (err, data) {
            console.log("Friends: %s", JSON.stringify(data, null, '  '));
            callback(err);
        });
    }

    /**
     * Retrieve all the starred segments for the user, including the efforts made by that user on each segment,
     * and the coordinates for the segment.
     * @param callback
     */
    function getStarredSegments(callback) {
        var results = [];
        strava.getStarredSegments(function (err, data) {
            if (err) {
                callback(err);
            } else if (data && data.errors) {
                callback(new Error(JSON.stringify(data)));
            } else {
                global.segments = data;
                console.log("Found %s starred segments", data ? data.length : 0);
                if (data && data.length && options.dates && options.dates.length) {
                    async.each(global.segments, getSegmentEfforts, function (err) {
                        if (err) {
                            callback(err);
                        } else {
                            // async.each(global.segments, getSegmentDetails, callback);
                            callback();
                        }
                    });
                }
            }
        });

        function getSegmentEfforts(segment, callback) {
            var results = [];
            async.each(options.dates, function (range, callback) {
                var params = {
                    id: segment.id,
                    athlete_id: options.athleteId,
                    per_page: 200,
                    start_date_local: (new Date(1000 * range.after)).toISOString(),
                    end_date_local: (new Date(1000 * range.before)).toISOString()
                };
                strava.getSegmentEfforts(segment.id, params, function (err, data) {
                    if (err) {
                        callback(err);
                    } else if (data && data.errors) {
                        callback(new Error(JSON.stringify(data)));
                    } else {
                        // append(data);
                        // console.log(data)
                        results = results.concat(data);
                        callback();
                    }
                });
            }, function (err) {
                if (err) {
                    callback(err);
                } else {
                    segment.efforts = _u.sortBy(results, 'elapsed_time');
                    console.log("Found %s efforts for %s", segment.efforts.length, segment.name);
                    callback();
                }
            });
        }

        // Not used, but this works
        function getSegmentDetails(segment, callback) {
            strava.getSegment(segment.id, function (err, data) {
                if (err) {
                    callback(err);
                } else if (data && data.errors) {
                    callback(new Error(JSON.stringify(data)));
                } else {
                    console.log("Retrieved details for %s, distance = %s m", segment.name, data.distance);
                    console.log(data)
                    segment.details = data;
                    callback();
                }
            });
        }
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
                if (err) {
                    callback(err);
                } else if (data && data.errors) {
                    callback(new Error(JSON.stringify(data)));
                } else {
                    count += data ? data.length : 0;
                    append(data);
                    callback();
                }
            });
        }, function (err) {
            global.activities = _u.sortBy(results, 'start_date');
            console.log("Found total of %s activities (from %s retrieved)", global.activities.length, count);
            callback(err);
        });

        function append(activities) {
            _u.each(activities, function (activity) {
                if ((!options.commuteOnly && !options.nonCommuteOnly) || ( options.commuteOnly && activity.commute) || (options.nonCommuteOnly && !activity.commute)) {
                    if (options.activityFilter.length) {
                        if (options.activityFilter.indexOf(activity.type) >= 0) {
                            activity.keys = ['distance', 'total_elevation_gain', 'moving_time', 'elapsed_time', 'average_temp'];
                            results.push(activity);
                        }
                    } else {
                        activity.keys = ['distance', 'total_elevation_gain', 'moving_time', 'elapsed_time', 'average_temp'];
                        results.push(activity);
                    }
                }
            });
        }
    }

    function addActivitiesDetails(callback) {
        console.log("Found %s activities", global.activities ? global.activities.length : 0);
        if (global.activities && global.activities.length) {
            async.each(global.activities, function (item, callback) {
                addActivityDetails(item, callback);
            }, callback);
        }

        function addActivityDetails(activity, callback) {
            strava.getActivity(activity.id, function (err, data) {
                if (err) {
                    callback(err);
                } else {
                    console.log("Adding activity details for " + activity.start_date_local + " " + activity.name);
                    // console.log(data);
                    if (false && data && data.segment_efforts) {
                        addDetailSegments(activity, data, function (err) {
                            if (err) {
                                callback(err);
                            } else {
                                if (data && data.description) {
                                    addDescription(activity, data);
                                }
                                callback();
                            }
                        });
                    } else if (data && data.description) {
                        addDescription(activity, data);
                        callback();
                    } else {
                        callback();
                    }
                }
            });
        }

        // Don't use this anymore. Instead we use the --segements option.
        function addDetailSegments(activity, data, callback) {
            var ignore = [];
            activity.segments = [];
            async.eachSeries(data.segment_efforts, function (segment, callback) {
                if (isInList('include', segment.id)) {
                    addDetailSegment(segment);
                    callback();
                } else if (isInList('exclude', segment.id)) {
                    ignore.push({ id: segment.id, name: segment.name });
                    callback();
                } else if (options.prompt) {
                    var str = "Include segment '" + segment.name + "' (y/n)? ";
                    promptSingleLine(str, function (value) {
                        if (value.match(/^y/i)) {
                            console.log("Including segment '%s'", segment.name);
                            addDetailSegment(segment);
                            global.segments.include.push({ id: segment.id, name: segment.name });
                            segmentsDirty = true;
                        } else {
                            console.log("Excluding segment '%s'", segment.name);
                            global.segments.exclude.push({ id: segment.id, name: segment.name });
                            segmentsDirty = true;
                        }
                        callback();
                    });
                } else {
                    ignore.push({ id: segment.id, name: segment.name });
                    callback();
                }
            }, function (err) {
                if (err) {
                    callback(err);
                } else {
                    if (activity.segments.length) {
                        activity.keys.push('segments');
                    }
                    if (false && ignore.length) {
                        console.log("Ignoring %s segments:", ignore.length);
                        _u.each(ignore, function (item) {
                            console.log(JSON.stringify(item));
                        });
                    }
                    callback();
                }
            });

            function addDetailSegment(segment) {
                console.log("  Adding segment '" + segment.name + "', elapsed time " + dateutil.formatMS(segment.elapsed_time * 1000, { ms: false, hours: true }));
                // Add segment to this activity
                activity.segments.push(_u.pick(segment, 'id', 'name', 'elapsed_time', 'moving_time', 'distance'));
                // Add effort to list of efforts for this segment, if not already there
                var effortId = segment.id;
                var segId = segment.segment.id;
                if (!global.segments.data[segId] || !global.segments.data[segId].efforts[effortId]) {
                    global.segments.data[segId] = global.segments.data[segId] || { efforts: {} };
                    _u.each(['name', 'distance', 'average_grade', 'elevation_high', 'elevation_low', 'start_latlng', 'end_latlng'], function (prop) {
                        global.segments.data[segId][prop] = segment.segment[prop];
                    });
                    global.segments.data[segId].efforts[effortId] = {id: effortId, elapsed_time: segment.elapsed_time, moving_time: segment.moving_time};
                    segmentsDirty = true;
                }
            }

            function isInList(listName, id) {
                var segment = _u.find(global.segments[listName], function (entry) {
                    return (id == entry.id) ? true : false;
                });
                return segment ? true : false;
            }
        }

        function addDescription(activity, data) {
            var p = data.description.split(/\r\n/);
            //console.log(p)
            if (p) {
                var a = [];
                _u.each(p, function (line) {
                    var kv = line.match(/^([^\s\=]+)\s*=\s*(.*)+$/);
                    //console.log(kv)
                    if (kv) {
                        activity.keys.push(kv[1]);
                        activity[kv[1]] = kv[2];
                    } else {
                        a.push(line);
                    }
                });
                if (a.length) {
                    activity.description = a.join('\n');
                    activity.keys.push('description');
                }
            } else {
                activity.description = data.description;
                activity.keys.push('description');
            }
        }
    }

    function addActivitiesCoordinates(callback) {
        addCoordinates('activities', callback);
    }

    function addSegmentsCoordinates(callback) {
        addCoordinates('segments', callback);
    }

    function addCoordinates(type, callback) {
        var obj = global[type];
        console.log("Found %s %s", obj ? obj.length : 0, type);
        async.each(obj, function (item, callback) {
            addCoordinates(item, callback);
        }, callback);

        function addCoordinates(objItem, callback) {
            strava.getStream(type, objItem.id, ['latlng'], {}, function (err, data) {
                if (err) {
                    callback(err);
                } else {
                    console.log("Processing coordinates for " + ( type === 'activities' ? objItem.start_date_local + " " : "" ) + objItem.name);
                    objItem.coordinates = [];
                    _u.each(data, function (item) {
                        if (item && item.type === 'latlng' && item.data) {
                            _u.each(item.data, function (pt) {
                                objItem.coordinates.push(pt);
                            });
                        }
                    });
                }
                callback(err);
            });
        }
    }

    function saveKml(callback) {
        console.log('saving')
        kml.outputActivities(global.activities, global.segments, options.kml, { more: options.more, dates: dateRanges }, callback);
        // kml.save(options.kml)
    }

    function listActivities(callback) {
        var distance = 0;
        var elevationGain = 0;
        _u.each(global.activities, function (activity) {
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

    function readSegmentsFile(callback) {
        if (fs.existsSync(segmentsFile)) {
            fs.stat(segmentsFile, function (err, stats) {
                if (err) {
                    callback(err);
                } else {
                    segmentsFileLastModified = stats.mtime;
                    fs.readFile(segmentsFile, 'utf8', function (err, data) {
                        if (err) {
                            callback(err);
                        } else {
                            try {
                                segments = JSON.parse(data);
                                segments.include = segments.include || [];
                                segments.exclude = segments.exclude || [];
                                segments.data = segments.data || {};
                                callback();
                            } catch (e) {
                                callback(e);
                            }
                        }
                    });
                }
            });
        } else {
            segments = { description: "Strava segments", include: [], exclude: [], data: {} };
            callback();
        }
    }

    function writeSegmentsFile(callback) {
        if (segmentsDirty === true) {
            console.log("Writing segments file");
            // Make a backup before overwriting the file
            fs.createReadStream(segmentsFile).pipe(fs.createWriteStream(segmentsFile + '_' + dateutil.toFileString(segmentsFileLastModified)));
            fs.writeFile(segmentsFile, JSON.stringify(segments, null, 4), function (err) {
                if (err) {
                    callback(err);
                } else {
                    console.log("Segments saved to " + segmentsFile);
                    callback();
                }
            });
        }
    }


}

//function promptSingleLine(str, fn) {
//    process.stdout.write(str);
//    process.stdin.setEncoding('utf8');
//    process.stdin.once('data', function (val) {
//        fn(val);
//    }).resume();
//}

