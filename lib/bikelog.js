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


var builder = require('xmlbuilder');
var _ = require('underscore');
var fs = require('fs');
var dateutil = require('dateutil');


module.exports = function( options ) {

    var self = {

        stream: undefined,
        buffer: undefined,
        bikes: {},
        options: options || {},

        combineActivities: function( activities ) {
            var result = {};
            _.each(activities, function( activity ) {
                var d = new Date(activity.start_date);
                var jd = d.getJulian();
                var entry = result[jd] || {jd: jd, date: new Date(activity.start_date), events: []};
                if( activity.type === 'Ride' ) {
                    var note = activity.name;
                    note += "\nAscend " + Math.round(activity.total_elevation_gain) + "m, ";
                    note += self.formatHMS(activity.elapsed_time, {seconds: false});
                    if( activity.description ) {
                        if( activity.commute ) {
                            note += "\nCommute: " + activity.description;
                        } else {
                            note += "\n" + activity.description;
                        }
                    }
                    if( _.isArray(activity.segments) ) {
                        _.each(activity.segments, function( segment ) {
                            note += "\nUp " + segment.name + " [" + self.formatMS(segment.moving_time) + "]";
                        });
                    }
                    if( entry.note0 ) {
                        entry.note0 += "\n" + note;
                    } else {
                        entry.note0 = note;
                    }
                    if( activity.gear_id && self.bikes[activity.gear_id] ) {
                        var dobj = {
                            distance: Math.round(activity.distance / 10) / 100,
                            bike: self.bikeMap(self.bikes[activity.gear_id].name)
                        };
                    }
                    if( entry.events.length < 2 ) {
                        entry.events.push(dobj);
                    } else {
                        var bDone = false;
                        for( var idx=1; idx>=0 && !bDone; --idx ) {
                            if( entry.events[idx].bike === dobj.bike ) {
                                entry.events[idx].distance += dobj.distance;
                                bDone = true;
                            }
                        }
                    }
                } else {
                    var note = activity.type + ": " + activity.name;
                    if( activity.description ) {
                        note += "\n" + activity.description;
                    }
                    if( entry.note0 ) {
                        entry.note0 += "\n" + note;
                    } else {
                        entry.note0 = note;
                    }
                }
                result[jd] = entry;
            });
            return result;
        },

        registerBikes: function( bikes ) {
            if( bikes && bikes.length ) {
                _.each(bikes, function( bike ) {
                    self.bikes[bike.id] = bike;
                });
            }
        },

        outputData: function( stravaActivities, bikes, file, options, callback ) {
            var file = file || 'bikelog.xml';
            self.outputOptions = options || {};
            var dateString;
            if( options.dates instanceof Array && options.dates.length ) {
                var ad = [];
                _.each(options.dates, function( range ) {
                    ad.push(range.after + " to " + range.before);
                });
                dateString = ad.join(', ');
            }

            self.buffer = ""; // new Buffer(8*1024);
            self.stream = fs.createWriteStream(file);

            self.registerBikes(bikes);
            var activities = self.combineActivities(stravaActivities);

            self.stream.once('open', function( fd ) {

                var doc = builder.create('fields', {version: '1.0', encoding: 'UTF-8'})
                    .att('xmlns:xfdf', 'http://ns.adobe.com/xfdf-transition/')
                    .ele('day');
                _.each(activities, function( activity ) {
                    var item = doc.ele('group').att('xfdf:original', activity.jd);
                    for( var idx = 0; idx < Math.min(activity.events.length, 2); ++idx ) {
                        var event = activity.events[idx];
                        var group = item.ele('group').att('xfdf:original', idx);
                        group.ele('bike', event.bike);
                        group.ele('dist', event.distance);
                    }
                    if( activity.note0 ) {
                        item.ele('note0', activity.note0);
                    }
                    if( activity.note1 ) {
                        item.ele('note1', activity.note1);
                    }
                });
                var s = doc.doc().end({pretty: true});
                self.stream.write(s);
                self.stream.end();
            });

            self.stream.once('error', function( err ) {
                self.stream.end();
                callback(err);
            });
        },

        write: function( indent, s ) {
            if( typeof indent === 'string' ) {
                this.buffer += s;
            } else {
                var indent = new Array(indent + 1).join("  ");
                this.buffer += indent + s;
            }
            //this.buffer.write( indent + s, 'utf8' );
        },

        writeln: function( indent, s ) {
            if( typeof indent === 'string' ) {
                this.buffer += s + "\n";
            } else {
                var indent = new Array(indent + 1).join("  ");
                this.buffer += indent + s + "\n";
            }
            //this.buffer.write( indent + s + "\n", 'utf8' );
        },

        flush: function( callback ) {
            var self = this;
            if( self.verbose ) {
                console.log("  Flushing %d bytes", self.buffer.length);
            }
            flush();
            function flush() {
                var bOk = self.stream.write(self.buffer);
                self.buffer = "";
                if( bOk ) {
                    callback();
                } else {
                    if( self.verbose ) {
                        console.log("  Waiting on drain event");
                    }
                    self.stream.once('drain', flush)
                }
            }
        },


        bikeMap: function( param ) {
            if( param.match(/serott/i) ) {
                return "S1";
            } else if( param.match(/spec/i) ) {
                return "SP1";
            } else if( param.match(/MTB1/i) ) {
                return "MTB1";
            } else if( param.match(/MTB2/i) ) {
                return "MTB2";
            } else if( param.match(/T1/i) ) {
                return "T1";
            } else if( param.match(/tallboy/i) ) {
                return "TB29";
            } else if( param.match(/orbea/i) ) {
                return "ORB29";
            }
        },

        formatHMS: function( s, options ) {
            options || ( options = {});
            var seconds = s % 60;
            var minutes = Math.floor(s / 60) % 60;
            var hours = Math.floor(s / ( 60 * 60));
            var result = self.pad(hours) + ':';
            result += self.pad(minutes);
            if( options.seconds !== false ) {
                result += ":" + self.pad(seconds);
            }
            return result;
        },

        formatMS: function( s, options ) {
            options || ( options = {});
            var seconds = s % 60;
            var minutes = Math.floor(s / 60);
            var result = minutes + ':';
            result += self.pad(seconds);
            return result;
        },

        pad: function( n ) {
            return n < 10 ? '0' + n : n;
        },

        last: true

    };

    return self;
};