"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Kml = void 0;
const epdoc_util_1 = require("epdoc-util");
const fs = __importStar(require("fs"));
const util_1 = require("./util");
const epdoc_timeutil_1 = require("epdoc-timeutil");
const REGEX = {
    color: /^[a-zA-Z0-9]{8}$/,
    moto: /^moto$/i
};
// Colors are aabbggrr
const defaultLineStyles = {
    Default: {
        color: 'C00000FF',
        width: 4
    },
    Ride: {
        color: 'C00000A0',
        width: 4
    },
    EBikeRide: {
        color: '7FFF00FF',
        width: 4
    },
    Moto: {
        color: '6414F03C',
        width: 4
    },
    Segment: {
        color: 'C0FFFFFF',
        width: 6
    },
    Commute: {
        color: 'C085037D',
        width: 4
    },
    Hike: {
        color: 'F0FF0000',
        width: 4
    },
    Walk: {
        color: 'F0f08000',
        width: 4
    },
    'Stand Up Paddling': {
        color: 'F0f08000',
        width: 4
    },
    'Nordic Ski': {
        color: 'F0f08000',
        width: 4
    }
};
class Kml {
    constructor(opts = {}) {
        this.lineStyles = defaultLineStyles;
        this.verbose = 9;
        this.buffer = '';
        this.trackIndex = 0;
        this.opts = opts;
        this.verbose = opts.verbose;
    }
    get imperial() {
        return this.opts && this.opts.imperial === true;
    }
    get more() {
        return this.opts && this.opts.more === true;
    }
    setLineStyles(styles) {
        Object.keys(styles).forEach(name => {
            const style = styles[name];
            if (style && (0, epdoc_util_1.isString)(style.color) && (0, epdoc_util_1.isNumber)(style.width) && REGEX.color.test(style.color)) {
                this.lineStyles[name] = style;
            }
            else {
                console.log('Warning: ignoring line style error for %s. Style must be in form \'{ "color": "C03030C0", "width": 2 }\'', name);
            }
        });
    }
    outputData(filepath, activities, segments) {
        const file = filepath || 'Activities.kml';
        return new Promise((resolve, reject) => {
            this.stream = fs.createWriteStream(file);
            this.stream.once('open', fd => {
                this.header()
                    .then(resp => {
                    if (this.opts.activities) {
                        return this.addActivities(activities);
                    }
                })
                    .then(resp => {
                    if (this.opts.segments) {
                        return this.addSegments(segments);
                    }
                })
                    .then(resp => {
                    return this.footer();
                })
                    .then(resp => {
                    this.stream.end();
                    console.log('Wrote ' + file);
                });
            });
            this.stream.once('error', err => {
                this.stream.end();
                err.message = 'Stream error ' + err.message;
                reject(err);
            });
            this.stream.once('close', () => {
                console.log('Close ' + file);
                resolve();
            });
            this.stream.on('finish', () => {
                console.log('Finish ' + file);
            });
            this.stream.on('drain', () => {
                this._flush();
            });
        });
    }
    addActivities(activities) {
        return __awaiter(this, void 0, void 0, function* () {
            if (activities && activities.length) {
                const dateString = this._dateString();
                const indent = 2;
                this.writeln(indent, '<Folder><name>Activities' + (dateString ? ' ' + dateString : '') + '</name><open>1</open>');
                return activities
                    .reduce((promiseChain, activity) => {
                    return promiseChain.then(() => {
                        const job = Promise.resolve().then(() => {
                            if (activity.hasKmlData()) {
                                this.outputActivity(indent + 1, activity);
                            }
                            return this.flush();
                        });
                        return job;
                    });
                }, Promise.resolve())
                    .then(resp => {
                    this.writeln(indent, '</Folder>');
                    return this.flush();
                });
            }
            return Promise.resolve();
        });
    }
    _dateString() {
        if (Array.isArray(this.opts.dates)) {
            const ad = [];
            this.opts.dates.forEach(range => {
                ad.push(range.after + ' to ' + range.before);
            });
            return ad.join(', ');
        }
        return '';
    }
    addSegments(segments) {
        if (segments && segments.length) {
            const indent = 2;
            const sortedSegments = segments.sort((a, b) => {
                return (0, util_1.compare)(a, b, 'name');
            });
            if (this.opts.segmentsFlatFolder === true) {
                this.outputSegments(indent, sortedSegments);
            }
            else {
                const regions = this.getSegmentRegionList(segments);
                Object.keys(regions).forEach(country => {
                    Object.keys(regions[country]).forEach(state => {
                        this.outputSegments(indent, sortedSegments, country, state);
                    });
                });
                return this.flush();
            }
        }
        return Promise.resolve();
    }
    outputSegments(indent, segments, country, state) {
        let title = 'Segments';
        const dateString = this._dateString();
        if (country && state) {
            title += ' for ' + state + ', ' + country;
        }
        else if (country) {
            title += ' for ' + country;
        }
        this.writeln(indent, '<Folder><name>' + title + '</name><open>1</open>');
        this.writeln(indent + 1, '<description>Efforts for ' + (dateString ? ' ' + dateString : '') + '</description>');
        segments.forEach(segment => {
            if (!country || (country === segment.country && state == segment.state)) {
                this.outputSegment(indent + 2, segment);
            }
        });
        this.writeln(indent, '</Folder>');
    }
    getSegmentRegionList(segments) {
        const regions = {};
        segments.forEach(segment => {
            regions[segment.country] = regions[segment.country] || {};
            if (segment.state) {
                regions[segment.country][segment.state] = true;
            }
        });
        console.log('Segments found in the following regions:\n  ' + JSON.stringify(regions));
        return regions;
    }
    outputActivity(indent, activity) {
        const t0 = activity.startDateLocal.substr(0, 10);
        let styleName = 'Default';
        // tslint:disable-next-line: no-string-literal
        const bike = activity.gearId ? this.opts.bikes[activity.gearId] : undefined;
        const isMoto = bike ? REGEX.moto.test(bike.name) : false;
        if (isMoto) {
            styleName = 'Moto';
        }
        else if (activity.commute && defaultLineStyles['Commute']) {
            styleName = 'Commute';
        }
        else if (defaultLineStyles[activity.type]) {
            styleName = activity.type;
        }
        const params = {
            placemarkId: 'StravaTrack' + ++this.trackIndex,
            name: t0 + ' - ' + (0, util_1.escapeHtml)(activity.name),
            description: this._buildActivityDescription(activity),
            styleName: styleName,
            coordinates: activity.coordinates
        };
        this.placemark(indent, params);
    }
    _buildActivityDescription(activity) {
        // console.log(this.opts)
        // console.log(activity.keys)
        if (this.more) {
            const arr = [];
            Object.keys(activity.keyDict).forEach(field => {
                // console.log(field + ' = ' + activity[field]);
                if (activity[field]) {
                    let key = field;
                    let value = activity[field];
                    if (field === 'distance') {
                        value = (0, util_1.getDistanceString)(value, this.imperial);
                    }
                    else if (field === 'movingTime' || field === 'elapsedTime') {
                        value = (0, epdoc_timeutil_1.durationUtil)(activity[field] * 1000).format({ ms: false });
                    }
                    else if (field === 'totalElevationGain') {
                        key = 'elevation_gain';
                        value = (0, util_1.getElevationString)(value, this.imperial);
                    }
                    else if (field === 'averageTemp' && (0, epdoc_util_1.isNumber)(value)) {
                        value = (0, util_1.getTemperatureString)(value, this.imperial); //  escapeHtml("˚C");
                    }
                    else if (field === '_segments' && activity[field].length) {
                        const segs = [];
                        segs.push('<b>Segments:</b><br><ul>');
                        activity[field].forEach(segment => {
                            const s = '<li><b>' +
                                segment.name +
                                ':</b> ' +
                                (0, epdoc_timeutil_1.durationUtil)(segment.elapsedTime * 1000).format({ ms: false }) +
                                '</li>';
                            segs.push(s);
                        });
                        segs.push('</ul>');
                        arr.push(segs.join('\n'));
                        value = undefined;
                    }
                    else if (field === 'description') {
                        value = value.replace('\n', '<br>');
                    }
                    if (value) {
                        arr.push('<b>' + (0, util_1.fieldCapitalize)(key) + ':</b> ' + value);
                    }
                }
            });
            // console.log(arr);
            return '<![CDATA[' + arr.join('<br>\n') + ']]>';
        }
    }
    /**
     * Add one segment to the KML file.
     * @param segment
     * @returns {string}
     */
    outputSegment(indent, segment) {
        const params = {
            placemarkId: 'StravaSegment' + ++this.trackIndex,
            name: (0, util_1.escapeHtml)(segment.name),
            description: this.buildSegmentDescription(segment),
            styleName: 'Segment',
            coordinates: segment.coordinates
        };
        this.placemark(indent, params);
    }
    buildSegmentDescription(segment) {
        return '';
    }
    _addLineStyle(name, style) {
        this.write(2, '<Style id="StravaLineStyle' + name + '">\n');
        this.write(3, '<LineStyle><color>' + style.color + '</color><width>' + style.width + '</width></LineStyle>\n');
        this.write(3, '<PolyStyle><color>' + style.color + '</color></PolyStyle>\n');
        this.write(2, '</Style>\n');
    }
    placemark(indent, params) {
        this.writeln(indent, '<Placemark id="' + params.placemarkId + '">');
        this.writeln(indent + 1, '<name>' + params.name + '</name>');
        if (params.description) {
            this.writeln(indent + 1, '<description>' + params.description + '</description>');
        }
        this.writeln(indent + 1, '<visibility>1</visibility>');
        this.writeln(indent + 1, '<styleUrl>#StravaLineStyle' + params.styleName + '</styleUrl>');
        this.writeln(indent + 1, '<LineString>');
        this.writeln(indent + 2, '<tessellate>1</tessellate>');
        if (params.coordinates && params.coordinates.length) {
            this.writeln(indent + 2, '<coordinates>');
            params.coordinates.forEach(coord => {
                this.write(0, '' + [coord[1], coord[0], 0].join(',') + ' ');
            });
            this.writeln(indent + 2, '</coordinates>');
        }
        this.writeln(indent + 1, '</LineString>');
        this.writeln(indent, '</Placemark>');
    }
    header() {
        this.write(0, '<?xml version="1.0" encoding="UTF-8"?>\n');
        this.write(1, '<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2" xmlns:kml="http://www.opengis.net/kml/2.2" xmlns:atom="http://www.w3.org/2005/Atom">');
        this.write(1, '<Document>\n');
        this.write(2, '<name>Strava Activities</name>\n');
        this.write(2, '<open>1</open>\n');
        Object.keys(this.lineStyles).forEach(name => {
            this._addLineStyle(name, this.lineStyles[name]);
        });
        return this.flush();
    }
    footer() {
        this.write(1, '</Document>\n</kml>\n');
        return this.flush();
    }
    write(indent, s) {
        if ((0, epdoc_util_1.isString)(indent)) {
            this.buffer += s;
        }
        else {
            const indent2 = new Array(indent + 1).join('  ');
            this.buffer += indent2 + s;
        }
    }
    writeln(indent, s) {
        if ((0, epdoc_util_1.isString)(indent)) {
            this.buffer += s + '\n';
        }
        else {
            const indent2 = new Array(indent + 1).join('  ');
            this.buffer += indent2 + s + '\n';
        }
        // this.buffer.write( indent + s + "\n", 'utf8' );
    }
    flush() {
        if (this.verbose) {
            console.log('  Flushing %d bytes', this.buffer.length);
        }
        return this._flush();
    }
    _flush() {
        return new Promise((resolve, reject) => {
            const tbuf = this.buffer;
            this.buffer = '';
            const bOk = this.stream.write(tbuf, () => {
                resolve();
            });
        });
    }
}
exports.Kml = Kml;
//# sourceMappingURL=kml.js.map