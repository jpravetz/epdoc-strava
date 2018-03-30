/*************************************************************************
 * BOTANIC ORGANIC CONFIDENTIAL
 * Copyright 2014 Botanic Organic. All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains the property
 * of Botanic Organic LLC. and its suppliers, if any. The intellectual and
 * technical concepts contained herein are proprietary to Botanic Organic
 * LLC. and its suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material is
 * strictly forbidden unless prior written permission is obtained from
 * Botanic Organic LLC..
 **************************************************************************/

var fs = require('fs');
var _ = require('underscore');
var async = require('async');
var dateutil = require('dateutil');
var Strava = require('../lib/stravaV3api');
var Kml = require('../lib/kml');
var Bikelog = require('../lib/bikelog');

module.exports = function( options ) {

    options || ( options = {});

    var self = {

        strava: undefined,
        kml: undefined,
        athlete: {},
        activities: [],
        segments: [],
        gear: [],
        segmentEfforts: {},     // by jd
        starredSegments: [],

        init: function( callback ) {
            if( options.config && options.config.client ) {

                self.strava = new Strava(options.config.client);

                if( options.kml ) {
                    // Run this first to validate line styles before pinging strava APIs
                    self.kml = new Kml({verbose: options.verbose});
                    if( options.config.lineStyles ) {
                        self.kml.setLineStyles(options.config.lineStyles);
                    }
                }

                if( options.segmentsFile ) {
                    self.readSegmentsFile(options.segmentsFile, function( err ) {
                        callback(err);
                    });
                } else {
                    callback();
                }
            } else {
                callback(new Error("No config file specified"));
            }
        },

        run: function( callback ) {

            self.init(function( err ) {
                if( err ) {
                    callback(err);
                } else if( options.kml && !options.activities && !options.segments ) {
                    callback(new Error("When writing kml select either segments, activities or both"));
                } else {
                    var funcs = [];

                    if( options.athlete ) {
                        funcs.push(self.getAthlete);
                        funcs.push(self.showAthlete);
                    }
                    if( options.friends ) {
                        funcs.push(self.getFriends);
                    }
                    if( options.activities ) {
                        funcs.push(self.getActivities);
                    }
                    if( options.segments ) {
                        funcs.push(self.getStarredSegments);
                    }
                    if( options.more && options.activities ) {
                        funcs.push(self.addActivitiesDetails);
                    }
                    if( options.kml ) {
                        if( options.activities ) {
                            funcs.push(self.addActivitiesCoordinates);
                        }
                        if( options.segments ) {
                            funcs.push(self.addSegmentsCoordinates);
                        }
                        funcs.push(self.saveKml);
                    } else if( options.fxml ) {
                        funcs.push(self.getAthlete);
                        funcs.push(self.getStarredSegmentList);
                        funcs.push(self.getActivities);
                        funcs.push(self.addActivitiesDetails);
                        funcs.push(self.saveXml);
                    } else if( options.dates && options.dates.length ) {
                        funcs.push(self.listActivities);
                    }

                    async.series(funcs, callback);
                }
            });
        },


        /**
         * Get athlete information and store as self.athlete.
         * Also retrieves list of bikes (self.athlete.bikes).
         * @param callback
         */
        getAthlete: function( callback ) {
            self.strava.getAthlete(options.athleteId, function( err, data ) {
                self.athlete = data;
                callback(err);
            });
        },

        showAthlete: function( callback ) {
            console.log("Athlete: %s", JSON.stringify(self.athlete, null, '  '));
        },

        getFriends: function( callback ) {
            self.strava.getFriends({athleteId: options.athleteId, more: options.more}, function( err, data ) {
                console.log("Friends: %s", JSON.stringify(data, null, '  '));
                callback(err);
            });
        },

        getStarredSegmentList: function( callback ) {
            self.starredSegment = [];
            self.strava.getStarredSegments(function( err, data ) {
                if( err ) {
                    callback(err);
                } else if( data && data.errors ) {
                    callback(new Error(JSON.stringify(data)));
                } else {
                    self.segments = data;
                    console.log("Found %s starred segments:", data ? data.length : 0);
                    // Hash for faster retrieval
                    _.each(data, function( segment ) {
                        self.starredSegment.push(segment.name);
                        var x = 0;
                    });
                    callback();
                }
            });
        },

        /**
         * Retrieve all the starred segments for the user, including the efforts made by that user on each segment,
         * and the coordinates for the segment. Efforts will be retrieved for the specified date range.
         * @param callback
         */
        getStarredSegments: function( callback ) {
            var results = [];
            self.strava.getStarredSegments(function( err, data ) {
                if( err ) {
                    callback(err);
                } else if( data && data.errors ) {
                    callback(new Error(JSON.stringify(data)));
                } else {
                    self.segments = data;
                    console.log("Found %s starred segments:", data ? data.length : 0);
                    if( data && data.length && options.dates && options.dates.length ) {
                        async.each(self.segments, self._getSegmentEfforts, function( err ) {
                            if( err ) {
                                callback(err);
                            } else {
                                // async.each(self.segments, getSegmentDetails, callback);
                                callback();
                            }
                        });
                    }
                }
            });
        },

        _getSegmentEfforts: function( segment, callback ) {
            var results = [];
            async.each(options.dates, function( range, callback ) {
                var params = {
                    id: segment.id,
                    athlete_id: options.athleteId,
                    per_page: 200,
                    start_date_local: (new Date(1000 * range.after)).toISOString(),
                    end_date_local: (new Date(1000 * range.before)).toISOString()
                };
                self.strava.getSegmentEfforts(segment.id, params, function( err, data ) {
                    if( err ) {
                        callback(err);
                    } else if( data && data.errors ) {
                        callback(new Error(JSON.stringify(data)));
                    } else {
                        // append(data);
                        // console.log(data)
                        if( _.isArray(data) && data.length ) {
                            _.each(data, function( item ) {
                                //var jd = (new Date(item.start_date)).getJulian();
                                //if( self.segmentEfforts[jd] ) {
                                //    self.segmentEfforts[jd].push(item);
                                //} else {
                                //    self.segmentEfforts[jd] = [ item ];
                                //}
                                results.push(item);
                            });
                        }
                        callback();
                    }
                });
            }, function( err ) {
                if( err ) {
                    callback(err);
                } else {
                    segment.efforts = _.sortBy(results, 'elapsed_time');
                    console.log("  Found %s efforts for %s", segment.efforts.length, segment.name);
                    callback();
                }
            });
        },

        // Not used, but this works
        getSegmentDetails: function( segment, callback ) {
            self.strava.getSegment(segment.id, function( err, data ) {
                if( err ) {
                    callback(err);
                } else if( data && data.errors ) {
                    callback(new Error(JSON.stringify(data)));
                } else {
                    console.log("Retrieved details for %s, distance = %s m", segment.name, data.distance);
                    console.log(data)
                    segment.details = data;
                    callback();
                }
            });
        },

        getActivities: function( callback ) {
            var results = [];
            var count = 0;

            var local = {
                append: function( activities ) {
                    _.each(activities, function( activity ) {
                        // console.log(activity);
                        if( (!options.commuteOnly && !options.nonCommuteOnly) || ( options.commuteOnly && activity.commute) || (options.nonCommuteOnly && !activity.commute) ) {
                            if( options.activityFilter.length ) {
                                if( options.activityFilter.indexOf(activity.type) >= 0 ) {
                                    activity.keys = ['distance', 'total_elevation_gain', 'moving_time', 'elapsed_time', 'average_temp', 'device_name'];
                                    results.push(activity);
                                }
                            } else {
                                activity.keys = ['distance', 'total_elevation_gain', 'moving_time', 'elapsed_time', 'average_temp', 'device_name'];
                                results.push(activity);
                            }
                        }
                    });
                }
            };

            async.eachSeries(options.dates, function( range, callback ) {
                var params = {
                    athleteId: options.athleteId,
                    per_page: 200,
                    after: range.after,
                    before: range.before
                };
                self.strava.getActivities(params, function( err, data ) {
                    if( err ) {
                        callback(err);
                    } else if( data && data.errors ) {
                        callback(new Error(JSON.stringify(data)));
                    } else {
                        count += data ? data.length : 0;
                        local.append(data);
                        callback();
                    }
                });
            }, function( err ) {
                self.activities = _.sortBy(results, 'start_date');
                console.log("Found total of %s activities (from %s retrieved)", self.activities.length, count);
                callback(err);
            });
        },


        addActivitiesDetails: function( callback ) {

            var local = {
                addActivityDetails: function( activity, callback ) {
                    self.strava.getActivity(activity.id, function( err, data ) {
                        if( err ) {
                            callback(err);
                        } else {
                            console.log("  Adding activity details for " + activity.start_date_local + " " + activity.name);
                            // console.log(data);
                            if( data && data.segment_efforts && data.segment_efforts.length ) {
                                local.addDetailSegments(activity, data, function( err ) {
                                    if( err ) {
                                        callback(err);
                                    } else {
                                        if( data && data.description ) {
                                            local.addDescription(activity, data);
                                        }
                                        callback();
                                    }
                                });
                            } else if( data && data.description ) {
                                local.addDescription(activity, data);
                                callback();
                            } else {
                                callback();
                            }
                        }
                    });
                },

                isInList: function( listName, id ) {
                    var segment = _.find(self.segments[listName], function( entry ) {
                        return (id == entry.id) ? true : false;
                    });
                    return segment ? true : false;
                },

                addDetailSegment: function( activity, segment ) {
                    var name = String(segment.name).trim();
                    if( self.segmentConfig && self.segmentConfig.alias && self.segmentConfig.alias[name] ) {
                        name = self.segmentConfig.alias[name];
                        segment.name = name;
                    }
                    console.log("  Adding segment '" + name + "', elapsed time " + dateutil.formatMS(segment.elapsed_time * 1000, {
                        ms: false,
                        hours: true
                    }));
                    // Add segment to this activity
                    activity.segments.push(_.pick(segment, 'id', 'name', 'elapsed_time', 'moving_time', 'distance'));
                },


                // Don't use this anymore. Instead we use the --segments option.
                addDetailSegments: function( activity, data, callback ) {
                    var ignore = [];
                    activity.segments = [];
                    async.eachSeries(data.segment_efforts, function( segment, cb ) {
                        if( _.isArray(self.starredSegment) && self.starredSegment.indexOf(segment.name) >= 0 ) {
                            local.addDetailSegment( activity, segment);
                            cb();
                        } else {
                            cb();
                        }
                    }, function( err ) {
                        if( err ) {
                            callback(err);
                        } else {
                            if( activity.segments.length ) {
                                activity.keys.push('segments');
                            }
                            if( false && ignore.length ) {
                                console.log("Ignoring %s segments:", ignore.length);
                                _.each(ignore, function( item ) {
                                    console.log(JSON.stringify(item));
                                });
                            }
                            callback();
                        }
                    });
                },

                addDescription: function( activity, data ) {
                    var p = data.description.split(/\r\n/);
                    //console.log(p)
                    if( p ) {
                        var a = [];
                        _.each(p, function( line ) {
                            var kv = line.match(/^([^\s\=]+)\s*=\s*(.*)+$/);
                            //console.log(kv)
                            if( kv ) {
                                activity.keys.push(kv[1]);
                                activity[kv[1]] = kv[2];
                            } else {
                                a.push(line);
                            }
                        });
                        if( a.length ) {
                            activity.description = a.join('\n');
                            activity.keys.push('description');
                        }
                    } else {
                        activity.description = data.description;
                        activity.keys.push('description');
                    }
                }
            };


            console.log("Found %s activities:", self.activities ? self.activities.length : 0);
            if( self.activities && self.activities.length ) {
                async.each(self.activities, function( item, callback ) {
                    local.addActivityDetails(item, callback);
                }, callback);
            }


        },

        addActivitiesCoordinates: function( callback ) {
            self._addCoordinates('activities', callback);
        },


        addSegmentsCoordinates: function( callback ) {
            self._addCoordinates('segments', callback);
        },


        _addCoordinates: function( type, callback ) {

            local = {
                addCoordinates: function( objItem, callback ) {
                    self.strava.getStream(type, objItem.id, ['latlng'], {}, function( err, data ) {
                        if( err ) {
                            callback(err);
                        } else {
                            console.log("  Processing coordinates for " + ( type === 'activities' ? objItem.start_date_local + " " : "" ) + objItem.name);
                            objItem.coordinates = [];
                            _.each(data, function( item ) {
                                if( item && item.type === 'latlng' && item.data ) {
                                    _.each(item.data, function( pt ) {
                                        objItem.coordinates.push(pt);
                                    });
                                }
                            });
                        }
                        callback(err);
                    });
                }
            };

            var obj = self[type];
            console.log("Found %s %s:", obj ? obj.length : 0, type);
            async.each(obj, function( item, callback ) {
                local.addCoordinates(item, callback);
            }, callback);
        },


        saveKml: function( callback ) {
            var opts = {
                more: options.more,
                dates: options.dateRanges,
                imperial: options.imperial
            };
            if( options.segments === 'flat' ) {
                opts.segmentsFlatFolder = true;
            }
            self.kml.outputData(self.activities, self.segments, options.kml, opts, function( err, data ) {
                callback(err);
            });
            // kml.save(options.kml)
        },

        saveXml: function( callback ) {
            var bikelog = new Bikelog();
            var opts = {
                more: options.more,
                dates: options.dateRanges,
                imperial: options.imperial
            };
            if( options.segments === 'flat' ) {
                opts.segmentsFlatFolder = true;
            }
            bikelog.outputData(self.activities, self.athlete.bikes, options.fxml, opts, callback);
        },

        listActivities: function( callback ) {
            var distance = 0;
            var elevationGain = 0;
            _.each(self.activities, function( activity ) {
                var t0 = activity.start_date_local.substr(0, 10);
                console.log(t0 + " - " + activity.name +
                " (distance " + Math.round(activity.distance / 10) / 100 +
                " km, elevation gain " + Math.round(activity.total_elevation_gain) + " m)");
                distance += activity.distance;
                elevationGain += activity.total_elevation_gain;
            });
            console.log("Total distance %s km, elevation gain %s m", Math.round(distance / 10) / 100, Math.round(elevationGain));
            callback();
        },


        readSegmentsFile: function( segmentsFile, callback ) {
            if( fs.existsSync(segmentsFile) ) {
                fs.stat(segmentsFile, function( err, stats ) {
                    if( err ) {
                        callback(err);
                    } else {
                        self.segmentsFileLastModified = stats.mtime;
                        fs.readFile(segmentsFile, 'utf8', function( err, data ) {
                            if( err ) {
                                callback(err);
                            } else {
                                try {
                                    self.segmentConfig = JSON.parse(data);
                                    self.segmentConfig || ( self.segmentConfig = {} );
                                    self.segmentConfig.alias || ( self.segmentConfig.alias = {} );
                                    self.segmentConfig.data || ( self.segmentConfig.data = {} );
                                    callback();
                                } catch( e ) {
                                    callback(e);
                                }
                            }
                        });
                    }
                });
            } else {
                self.segmentConfig = {description: "Strava segments", alias: {}, data: {}};
                callback();
            }
        },

        writeSegmentsFile: function( segmentsFiles, callback ) {
            if( self.segmentsDirty === true ) {
                console.log("Writing segments file");
                // Make a backup before overwriting the file
                fs.createReadStream(segmentsFile).pipe(fs.createWriteStream(segmentsFile + '_' + dateutil.toFileString(self.segmentsFileLastModified)));
                fs.writeFile(segmentsFile, JSON.stringify(self.segments, null, 4), function( err ) {
                    if( err ) {
                        callback(err);
                    } else {
                        console.log("Segments saved to " + segmentsFile);
                        callback();
                    }
                });
            }
        },

        last: true
    };

    return self;
};


