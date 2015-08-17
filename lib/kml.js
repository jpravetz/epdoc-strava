/*************************************************************************
 * Copyright(c) 2012-2015 Jim Pravetz <jpravetz@epdoc.com>
 * May be freely distributed under the MIT license.
 **************************************************************************/



var fs = require('fs');
var _u = require('underscore');
var dateutil = require('dateutil');
var async = require('async');

/**
 * Output KML file
 */

// Colors are aabbggrr
var defaultLineStyles = {
    Default: {
        color: "C00000FF", width: 4
    },
    Ride: {
        color: "C00000A0", width: 4
    },
    Segment: {
        color: "C0FFFFFF", width: 6
    },
    Commute: {
        color: "C085037D", width: 4
    },
    Hike: {
        color: "F0FF0000", width: 4
    },
    Walk: {
        color: "F0f08000", width: 4
    }
};

var defaultPointStyles = {
    Start: {
        scale: 0.7,
        iconUrl: 'http://maps.google.com/mapfiles/kml/paddle/S.png',
        listUrl: 'http://maps.google.com/mapfiles/kml/paddle/S-lv.png'
    }
};

var Kml = function (options) {
    options = options || {};
    this.trackIndex = 0;
    this.lineStyles = defaultLineStyles;
    this.stream = undefined;
    this.buffer = undefined;
    this.verbose = options.verbose;
};

Kml.prototype.setLineStyles = function (styles) {
    var self = this;
    _u.each(styles, function (style, name) {
        if (style && typeof style.color === 'string' && typeof style.width === 'number' && style.color.match(/^[a-zA-Z0-9]{8}$/)) {
            self.lineStyles[name] = style;
        } else {
            console.log("Warning: ignoring line style error for %s. Style must be in form '{ \"color\": \"C03030C0\", \"width\": 2 }'", name);
        }
    });
};


Kml.prototype.outputData = function (activities, segments, file, options, callback) {
    var self = this;
    file = file || 'Activities.kml';
    self.outputOptions = options;
    var dateString;
    if (options.dates instanceof Array && options.dates.length) {
        var ad = [];
        _u.each(options.dates, function (range) {
            ad.push(range.after + " to " + range.before);
        });
        dateString = ad.join(', ');
    }

    self.buffer = ""; // new Buffer(8*1024);
    self.stream = fs.createWriteStream(file);

    self.stream.once('open', function (fd) {

        async.series([addHeader, addActivities, addSegments, addFooter], callback);

        function addHeader(cb) {
            self.header(file, cb);
        }

        function addActivities(cb) {
            if (activities && activities.length) {
                var indent = 2;
                self.writeln(indent, "<Folder><name>Activities" + ( dateString ? " " + dateString : "" ) + "</name><open>1</open>");
                async.eachSeries(activities, function (activity, cb2) {
                    self.outputActivity(indent + 1, activity);
                    self.flush(cb2);
                }, function (err) {
                    if (err) {
                        cb(err);
                    } else {
                        self.writeln(indent, "</Folder>");
                        self.flush(cb);
                    }
                });
            } else {
                cb();
            }
        }

        function addSegments(cb) {
            if (segments && segments.length) {
                var indent = 2;
                var sortedSegments = _u.sortBy(segments, 'name');
                if (options.segmentsFlatFolder === true) {
                    outputSegments(indent, sortedSegments);
                } else {
                    var regions = getSegmentRegionList(segments);
                    _u.each(regions, function (value, country) {
                        _u.each(value, function (value, state) {
                            outputSegments(indent, sortedSegments, country, state);
                        });
                    });
                    self.flush(cb);
                }
            } else {
                cb();
            }
        }

        function addFooter(cb) {
            self.footer(function () {
                self.stream.end();
                console.log("Wrote " + file);
                cb();
            });
        }

    });

    self.stream.once('error', function (err) {
        self.stream.end();
        callback(err);
    });

    function outputSegments(indent, segments, country, state) {
        var title = "Segments";
        if (country && state) {
            title += " for " + state + ", " + country;
        } else if (country) {
            title += " for " + country;
        }
        self.writeln(indent, "<Folder><name>" + title + "</name><open>1</open>");
        self.writeln(indent + 1, "<description>Efforts for " + ( dateString ? " " + dateString : "" ) + "</description>");
        _u.each(segments, function (segment) {
            if (!country || ( country === segment.country && state == segment.state )) {
                self.outputSegment(indent + 2, segment);
            }
        });
        self.writeln(indent, "</Folder>");
    }

    function getSegmentRegionList(segments) {
        var regions = {};
        _u.each(segments, function (segment) {
            regions[segment.country] = regions[segment.country] || {};
            if (segment.state) {
                regions[segment.country][segment.state] = true;
            }
        });
        console.log("Segments found in the following regions:\n  " + JSON.stringify(regions));
        return regions;
    }
};

Kml.prototype.write = function (indent, s) {
    if (typeof indent === 'string') {
        this.buffer += s;
    } else {
        indent = new Array(indent + 1).join("  ");
        this.buffer += indent + s;
    }
    //this.buffer.write( indent + s, 'utf8' );
};

Kml.prototype.writeln = function (indent, s) {
    if (typeof indent === 'string') {
        this.buffer += s + "\n";
    } else {
        indent = new Array(indent + 1).join("  ");
        this.buffer += indent + s + "\n";
    }
    //this.buffer.write( indent + s + "\n", 'utf8' );
};

Kml.prototype.flush = function (callback) {
    var self = this;
    if (self.verbose) {
        console.log("  Flushing %d bytes", self.buffer.length);
    }
    flush();
    function flush() {
        var bOk = self.stream.write(self.buffer);
        self.buffer = "";
        if (bOk) {
            callback();
        } else {
            if (self.verbose) {
                console.log("  Waiting on drain event");
            }
            self.stream.once('drain', flush);
        }
    }
};


Kml.prototype.header = function (file, callback) {
    var self = this;
    self.write(0, '<?xml version="1.0" encoding="UTF-8"?>\n');
    self.write(1, '<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2" xmlns:kml="http://www.opengis.net/kml/2.2" xmlns:atom="http://www.w3.org/2005/Atom">');
    self.write(1, '<Document>\n');
    self.write(2, '<name>Strava Activities</name>\n');
    self.write(2, '<open>1</open>\n');
    _u.each(self.lineStyles, function (style, name) {
        addLineStyle(name, style);
    });
    self.flush(callback);

    function addLineStyle(name, style) {
        self.write(2, '<Style id="StravaLineStyle' + name + '">\n');
        self.write(3, '<LineStyle><color>' + style.color + '</color><width>' + style.width + '</width></LineStyle>\n');
        self.write(3, '<PolyStyle><color>' + style.color + '</color></PolyStyle>\n');
        self.write(2, '</Style>\n');
    }

    /* NOT USED (yet)
     function addPointStyle(name, char, style) {
     var s = '  <Style id="StravaPoint' + name + '">';
     s += '    <IconStyle><scale>' + style.scale + '</scale><Icon><href>' + style.iconUrl + '</href></Icon>';
     s += '      <hotSpot x="32" y="1" xunits="pixels" yunits="pixels"/>';
     s += '    </IconStyle>';
     s += '    <ListStyle><ItemIcon><href>' + style.listUrl + '</href></ItemIcon></ListStyle>';
     s += '    </Style>\n';
     s += '    <StyleMap id="StravaPushpin' + name + '">';
     s += '      <Pair><key>normal</key><styleUrl>#StravaPushpin' + name + '</styleUrl></Pair>';
     //s += '      <Pair><key>highlight</key><styleUrl>#s_ylw-pushpin_hl</styleUrl></Pair>';
     s += '    </StyleMap>';
     return s;
     };
     */

};


Kml.prototype.footer = function (callback) {
    this.write(1, '</Document>\n</kml>\n');
    this.flush(callback);
};

/**
 * Add one segment to the KML file.
 * @param segment
 * @returns {string}
 */
Kml.prototype.outputSegment = function (indent, segment) {
    var self = this;

    var params = {
        placemarkId: "StravaSegment" + (++this.trackIndex),
        name: escapeHtml(segment.name),
        description: buildDescription(segment),
        styleName: 'Segment',
        coordinates: segment.coordinates
    };
    this.placemark(indent, params);

    function buildDescription() {
        //console.log(self.outputOptions)
        //console.log(segment.keys)
        if (self.outputOptions && self.outputOptions.more === true) {
            var arr = [];
            arr.push(kvString('Distance', self.getDistanceString(segment.distance)));
            arr.push(kvString('Elevation', self.getElevationString(segment.elevation_high - segment.elevation_low, 1, "m")));
            arr.push(kvString('Gradient', precision(segment.average_grade, 100, "%")));
            _u.each(segment.efforts, function (effort) {
                var key = effort.start_date_local.replace(/T.*$/, "");
                var value = timeString(effort.elapsed_time);
                if (effort.elapsed_time !== effort.moving_time) {
                    value += " (" + timeString(effort.moving_time) + ")";
                }
                arr.push(kvString(key, value));
            });
            //console.log(arr);
            return "<![CDATA[" + arr.join("<br>\n") + "]]>";
        }

        function kvString(k, v) {
            return '<b>' + k + ":</b> " + v;
        }

        function timeString(seconds) {
            return dateutil.formatMS(seconds * 1000, {ms: false, hours: true});
        }
    }
};

Kml.prototype.outputActivity = function (indent, activity) {
    var self = this;
    var t0 = activity.start_date_local.substr(0, 10);
    var styleName = 'Default';
    if (activity.commute && defaultLineStyles.Commute) {
        styleName = 'Commute';
    } else if (defaultLineStyles[activity.type]) {
        styleName = activity.type;
    }

    var params = {
        placemarkId: "StravaTrack" + (++this.trackIndex),
        name: t0 + ' - ' + escapeHtml(activity.name),
        description: buildDescription(activity),
        styleName: styleName,
        coordinates: activity.coordinates
    };
    this.placemark(indent, params);

    function buildDescription() {
        //console.log(self.outputOptions)
        //console.log(activity.keys)
        if (self.outputOptions && self.outputOptions.more === true) {
            var arr = [];
            _u.each(activity.keys, function (field) {
                if (activity[field]) {
                    var key = field;
                    var value = activity[field];
                    if (field === 'distance') {
                        value = self.getDistanceString(value);
                    } else if (field === 'moving_time' || field === 'elapsed_time') {
                        value = dateutil.formatMS(activity[field] * 1000, {ms: false, hours: true});
                    } else if (field === 'total_elevation_gain') {
                        key = 'elevation_gain';
                        value = self.getElevationString(value);
                    } else if (field === 'average_temp' && typeof value === 'number') {
                        value = self.getTemperatureString(value); //  escapeHtml("˚C");
                    } else if (field === 'segments' && activity[field].length) {
                        var segs = [];
                        segs.push('<b>Segments:</b><br><ul>');
                        _u.each(activity[field], function (segment) {
                            var s = '<li><b>' + segment.name + ":</b> " + dateutil.formatMS(segment.elapsed_time * 1000, {ms: false, hours: true}) + '</li>';
                            segs.push(s);
                        });
                        segs.push('</ul>');
                        arr.push(segs.join('\n'));
                        value = undefined;
                    } else if (field === 'description') {
                        value = value.replace("\n", "<br>");
                    }
                    if (value) {
                        arr.push('<b>' + fieldCapitalize(key) + ":</b> " + value);
                    }
                }
            });
            //console.log(arr);
            return "<![CDATA[" + arr.join("<br>\n") + "]]>";
        }
    }
};

Kml.prototype.getDistanceString = function (value) {
    if (this.outputOptions.imperial === true) {
        return precision(value / 1609.344, 100, " miles");
    } else {
        return precision(value / 1000, 100, " km");
    }
};

Kml.prototype.getElevationString = function (value) {
    if (this.outputOptions.imperial === true) {
        return precision(value / 0.3048, 1, " ft");
    } else {
        return precision(value, 1, " m");
    }
};

Kml.prototype.getTemperatureString = function (value) {
    if (this.outputOptions.imperial === true) {
        return precision((value * 9 / 5) + 32, 1, "&deg;F");
    } else {
        return value + "&deg;C";
    }
};

function precision(num, r, unit) {
    return String(Math.round(num * r) / r) + unit;
}


Kml.prototype.placemark = function (indent, params) {
    var self = this;
    self.writeln(indent, '<Placemark id="' + params.placemarkId + '">');
    self.writeln(indent + 1, '<name>' + params.name + '</name>');
    if (params.description) {
        self.writeln(indent + 1, '<description>' + params.description + '</description>');
    }

    self.writeln(indent + 1, '<visibility>1</visibility>');
    self.writeln(indent + 1, '<styleUrl>#StravaLineStyle' + params.styleName + '</styleUrl>');
    self.writeln(indent + 1, '<LineString>');
    self.writeln(indent + 2, '<tessellate>1</tessellate>');
    if (params.coordinates && params.coordinates.length) {
        self.writeln(indent + 2, '<coordinates>');
        _u.each(params.coordinates, function (coord) {
            self.write(0, "" + [coord[1], coord[0], 0].join(',') + " ");
        });
        self.writeln(indent + 2, '</coordinates>');
    }
    self.writeln(indent + 1, '</LineString>');
    self.writeln(indent, '</Placemark>');

};


function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function fieldCapitalize(name) {
    return name.replace(/^([a-z])/, function ($1) {
        return $1.toUpperCase();
    }).replace(/(\_[a-z])/g, function ($1) {
        return $1.toUpperCase().replace('_', ' ');
    });
}

module.exports = Kml;

/*

 Kml.prototype.outputActivity = function (activity, segments) {
 var t0 = activity.start_date_local.substr(0, 10);
 t0 = t0.replace(/\-/g, '');
 var file = t0 + '_' + activity.name.replace(/[^a-zA-Z0-9]/g, '') + '.kml';
 var s = ''; //this.header(file);
 s += this.placeholder(activity);
 //s += this.footer();
 console.log("Creating " + file);
 fs.writeFileSync(file, s);
 };


 Kml.prototype.segment = function (segment) {
 var self = this;
 var s = '';
 addPlacemark(s, 'Start');
 addPlacemark(s, 'End');
 function addPlacemark(s, type) {
 s += '  <Placemark><name>' + segment.name + '</name>';
 s += '    <styleUrl>#StravaPushpin' + type + '</styleUrl>';
 s += '    <Point<coordinates>' + segment[type.toLowerCase() + '_longitude'] + ',' + segment[type.toLowerCase() + '_latitude'] + ',0</coordinates></Point>';
 s += '  </Placemark>';
 }
 return s;
 };
 */