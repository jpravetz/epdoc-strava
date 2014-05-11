/*************************************************************************
 * Copyright(c) 2012-2014 Jim Pravetz <jpravetz@epdoc.com>
 * May be freely distributed under the MIT license.
 **************************************************************************/



var fs = require('fs');
var _u = require('underscore');
var dateutil = require('dateutil');

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
    Commute: {
        color: "C000A3FF", width: 4
    },
    Hike: {
        color: "F0FF0000", width: 4
    },
    Walk: {
        color: "F0f08000", width: 4
    }
};

var Kml = function (options) {
    this.trackIndex = 0;
    this.lineStyles = defaultLineStyles;
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

Kml.prototype.outputActivities = function (activities, file, options, callback) {
    var self = this;
    self.outputOptions = options;
    var file = file || 'Activities.kml';
    var s = self.header(file);
    _u.each(activities, function (activity) {
        s += self.placeholder(activity);
    });
    s += self.footer();
    console.log("Creating " + file);
    fs.writeFile(file, s, callback);
};


Kml.prototype.outputActivity = function (activity) {
    var t0 = activity.start_date_local.substr(0, 10);
    t0 = t0.replace(/\-/g, '');
    var file = t0 + '_' + activity.name.replace(/[^a-zA-Z0-9]/g, '') + '.kml';
    var s = this.header(file);
    s += this.placeholder(activity);
    s += this.footer();
    console.log("Creating " + file);
    fs.writeFileSync(file, s);
};


Kml.prototype.header = function (file) {
    var self = this;
    var s = '<?xml version="1.0" encoding="UTF-8"?>';
    s += '  <kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2" xmlns:kml="http://www.opengis.net/kml/2.2" xmlns:atom="http://www.w3.org/2005/Atom">';
    s += '  <Document>';
    s += '    <name>' + file + '</name>';
    _u.each(self.lineStyles, function (style, name) {
        s += addLineStyle(name, style);
    });
    return s;

    function addLineStyle(name, style) {
        var s = '    <Style id="StravaLineStyle' + name + '">';
        s += '      <LineStyle><color>' + style.color + '</color><width>' + style.width + '</width></LineStyle>';
        s += '      <PolyStyle><color>' + style.color + '</color></PolyStyle>';
        s += '    </Style>\n';
        return s;
    };
};


Kml.prototype.footer = function () {
    var s = '  </Document>';
    s += '</kml>';
    return s;
};

Kml.prototype.placeholder = function (activity) {
    var self = this;
    var t0 = activity.start_date_local.substr(0, 10);
    var styleName = 'Default';
    if (activity.commute && defaultLineStyles['Commute']) {
        styleName = 'Commute';
    } else if (defaultLineStyles[activity.type]) {
        styleName = activity.type;
    }
    var s = '    <Placemark id="StravaTrack' + (++this.trackIndex) + '">';
    s += '      <name>' + t0 + ' - ' + escapeHtml(activity.name) + '</name>';
    var description = buildDescription();
    if (description) {
        s += '      <description>' + description + '</description>';
    }
    s += '      <visibility>1</visibility>';
    s += '      <styleUrl>#StravaLineStyle' + styleName + '</styleUrl>';
    s += '      <LineString>';
    s += '        <tessellate>1</tessellate>';
    s += '        <coordinates>';
    _u.each(activity.coordinates, function (coord) {
        s += coord[1] + "," + coord[0] + ",0 ";
    });
    s += '        </coordinates>';
    s += '      </LineString>';
    s += '    </Placemark>';
    return s;

    function buildDescription() {
        //console.log(self.outputOptions)
        console.log(activity.keys)
        if (self.outputOptions && self.outputOptions.show === true) {
            var arr = [];
            _u.each(activity.keys, function (field) {
                if (activity[field]) {
                    var key = field;
                    var value = activity[field];
                    if (field === 'distance') {
                        value = Math.round(value / 10) / 100 + " km";
                    } else if (field === 'moving_time' || field === 'elapsed_time') {
                        value = dateutil.formatMS(activity[field] * 1000, { ms: false, hours: true });
                    } else if (field === 'total_elevation_gain') {
                        key = 'elevation_gain';
                        value = value + " m";
                    } else if (field === 'average_temp' && typeof value === 'number') {
                        value = value + "&deg;C"; //  escapeHtml("˚C");
                    } else if (field === 'segments' && activity[field].length) {
                        var segs = [];
                        segs.push('<b>Segments:</b><br><ul>');
                        _u.each(activity[field], function (segment) {
                            var s = '<li><b>' + segment.name + ":</b> " + dateutil.formatMS(segment.elapsed_time * 1000, { ms: false, hours: true }) + '</li>';
                            segs.push(s);
                        });
                        segs.push('</ul>');
                        arr.push(segs.join('\n'));
                        value = undefined;
                    } else if( field === 'description' ) {
                        value = value.replace("\n","<br>");
                    }
                    if (value) {
                        arr.push('<b>' + fieldCapitalize(key) + ":</b> " + value);
                    }
                }
            });
            //console.log(arr);
            return "<![CDATA[" + arr.join("<br>\n") +  "]]>";
        }
    }
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