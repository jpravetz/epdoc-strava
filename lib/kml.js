/*************************************************************************
 * Copyright 2014 Jim Pravetz. All Rights Reserved.
 **************************************************************************/

    
var fs = require('fs');
var _u = require('underscore');

/**
 * Output KML file
 */

var Kml = function (options) {
    this.trackIndex = 0;
};

// Colors are aabbggrr
var defaultLineStyles = {
    Default: {
        color: "C00000FF", width: 4
    },
    Ride: {
        color: "C00000A0", width: 4
    },
    Commute: {
        color: "F04080C0", width: 4
    },
    Hike: {
        color: "F0FF0000", width: 4
    },
    Walk: {
        color: "F0f08000", width: 4
    }
};

Kml.prototype.setLineStyles = function( styles ) {

};

Kml.prototype.outputActivities = function (activities, file, callback) {
    var self = this;
    var file = file || 'Activities.kml';
    var s = self.header(file);
    _u.each(activities, function (activity) {
        s += self.placeholder(activity);
    });
    s += self.footer();
    console.log("Creating " + file);
    fs.writeFile(file, s, callback);
};


Kml.prototype.outputActivity = function(activity) {
    var t0 = activity.start_date_local.substr(0, 10);
    t0 = t0.replace(/\-/g, '');
    var file = t0 + '_' + activity.name.replace(/[^a-zA-Z0-9]/g, '') + '.kml';
    var s = this.header(file);
    s += this.placeholder(activity);
    s += this.footer();
    console.log("Creating " + file);
    fs.writeFileSync(file, s);
};


Kml.prototype.header = function(file) {
    var s = '<?xml version="1.0" encoding="UTF-8"?>';
    s += '  <kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2" xmlns:kml="http://www.opengis.net/kml/2.2" xmlns:atom="http://www.w3.org/2005/Atom">';
    s += '  <Document>';
    s += '    <name>' + file + '</name>';
    _u.each( defaultLineStyles, function(style,name) {
        s += addLineStyle( name, style );
    });
    return s;

    function addLineStyle(name,style) {
        var s = '    <Style id="StravaLineStyle' + name + '">';
        s += '      <LineStyle><color>' + style.color + '</color><width>' + style.width + '</width></LineStyle>';
        s += '      <PolyStyle><color>' + style.color + '</color></PolyStyle>';
        s += '    </Style>\n';
        return s;
    };
};


Kml.prototype.footer = function() {
    var s = '  </Document>';
    s += '</kml>';
    return s;
};

Kml.prototype.placeholder = function(activity) {
    var t0 = activity.start_date_local.substr(0, 10);
    var styleName = 'Default';
    if( activity.commute && defaultLineStyles['Commute'] ) {
        styleName = 'Commute';
    } else if( defaultLineStyles[activity.type] ) {
        styleName = activity.type;
    }
    var s = '    <Placemark id="StravaTrack' + (++this.trackIndex) + '">';
    s += '      <name>' + t0 + ' - ' + escapeHtml(activity.name) + '</name>';
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
};

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

module.exports = Kml;