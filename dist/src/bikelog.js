"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("./util");
const builder = __importStar(require("xmlbuilder"));
const fs_1 = __importDefault(require("fs"));
class Bikelog {
    constructor(options) {
        this.buffer = '';
        this.bikes = {};
        this.options = {};
        this.verbose = 9;
        this.outputOptions = options;
    }
    /**
     * Combine strava activities into per-day information that is suitable for Acroform bikelog.
     * @param activities Array of strava activities.
     * @returns {{}} Dictionary of bikelog data, with keys set to julian day.
     */
    combineActivities(activities) {
        let result = {};
        activities.forEach(activity => {
            let d = new Date(activity.start_date);
            let jd = util_1.julianDate(d);
            let entry = result[jd] || { jd: jd, date: new Date(activity.start_date), events: [] };
            if (activity.type === 'Ride') {
                let note = 'Ascend ' + Math.round(activity.total_elevation_gain) + 'm, time ';
                note += this.formatHMS(activity.moving_time, { seconds: false });
                note += ' (' + this.formatHMS(activity.elapsed_time, { seconds: false }) + ')';
                if (activity.commute) {
                    note += '\nCommute: ' + activity.name;
                }
                else {
                    note += '\n' + activity.name;
                }
                if (activity.description) {
                    note += '\n' + activity.description;
                }
                if (Array.isArray(activity.segments)) {
                    let segs = [];
                    let up = 'Up ';
                    activity.segments.forEach(segment => {
                        segs.push(up + segment.name + ' [' + this.formatMS(segment.moving_time) + ']');
                        up = 'up ';
                    });
                    note += '\n' + segs.join(', ') + '\n';
                }
                if (entry.note0) {
                    entry.note0 += note;
                }
                else {
                    entry.note0 = note;
                }
                let dobj;
                if (activity.gear_id && this.bikes[activity.gear_id]) {
                    dobj = {
                        distance: Math.round(activity.distance / 10) / 100,
                        bike: this.bikeMap(this.bikes[activity.gear_id].name),
                        el: Math.round(activity.total_elevation_gain),
                        t: Math.round(activity.moving_time / 36) / 100
                    };
                }
                if (entry.events.length < 2) {
                    entry.events.push(dobj);
                }
                else {
                    let bDone = false;
                    for (let idx = 1; idx >= 0 && !bDone; --idx) {
                        if (entry.events[idx].bike === dobj.bike) {
                            entry.events[idx].distance += dobj.distance;
                            bDone = true;
                        }
                    }
                }
            }
            else {
                let distance = Math.round(activity.distance / 10) / 100;
                let note = activity.type + ': ' + distance + 'km ' + activity.name;
                note += ', moving time ' + this.formatHMS(activity.moving_time, { seconds: false });
                if (activity.description) {
                    note += '\n' + activity.description;
                }
                if (entry.note0) {
                    entry.note0 += '\n' + note;
                }
                else {
                    entry.note0 = note;
                }
            }
            result[jd] = entry;
        });
        return result;
    }
    registerBikes(bikes) {
        if (bikes && bikes.length) {
            bikes.forEach(bike => {
                this.bikes[bike.id] = bike;
            });
        }
    }
    outputData(stravaActivities, bikes, filepath) {
        filepath = filepath ? filepath : 'bikelog.xml';
        let dateString;
        if (this.outputOptions.dates instanceof Array && this.outputOptions.dates.length) {
            let ad = [];
            this.outputOptions.dates.forEach(range => {
                ad.push(range.after + ' to ' + range.before);
            });
            dateString = ad.join(', ');
        }
        this.buffer = ''; // new Buffer(8*1024);
        this.stream = fs_1.default.createWriteStream(filepath);
        this.registerBikes(bikes);
        let activities = this.combineActivities(stravaActivities);
        return new Promise((resolve, reject) => {
            this.stream.once('open', fd => {
                let doc = builder
                    .create('fields', { version: '1.0', encoding: 'UTF-8' })
                    .att('xmlns:xfdf', 'http://ns.adobe.com/xfdf-transition/')
                    .ele('day');
                Object.keys(activities).forEach(key => {
                    let activity = activities[key];
                    let item = doc.ele('group').att('xfdf:original', activity.jd);
                    for (let idx = 0; idx < Math.min(activity.events.length, 2); ++idx) {
                        let event = activity.events[idx];
                        if (event) {
                            let group = item.ele('group').att('xfdf:original', idx);
                            group.ele('bike', event.bike);
                            group.ele('dist', event.distance);
                            group.ele('el', event.el);
                            group.ele('t', event.t);
                        }
                    }
                    if (activity.note0) {
                        item.ele('note0', activity.note0);
                    }
                    if (activity.note1) {
                        item.ele('note1', activity.note1);
                    }
                });
                let s = doc.doc().end({ pretty: true });
                this.stream.write(s);
                this.stream.end();
                console.log(`Created ${filepath}`);
                resolve();
            });
            this.stream.once('error', function (err) {
                this.stream.end();
                err.message = 'Stream ' + err.message;
                reject(err);
            });
        });
    }
    write(indent, s) {
        if (typeof indent === 'string') {
            this.buffer += s;
        }
        else {
            let indent2 = new Array(indent + 1).join('  ');
            this.buffer += indent2 + s;
        }
        //this.buffer.write( indent + s, 'utf8' );
    }
    writeln(indent, s) {
        if (typeof indent === 'string') {
            this.buffer += s + '\n';
        }
        else {
            let indent2 = new Array(indent + 1).join('  ');
            this.buffer += indent2 + s + '\n';
        }
        //this.buffer.write( indent + s + "\n", 'utf8' );
    }
    flush() {
        if (this.verbose) {
            console.log('  Flushing %d bytes', this.buffer.length);
        }
        return this._flush();
    }
    _flush() {
        return new Promise((resolve, reject) => {
            let bOk = this.stream.write(this.buffer);
            this.buffer = '';
            if (bOk) {
                resolve();
            }
            else {
                if (this.verbose) {
                    console.log('  Waiting on drain event');
                }
                this.stream.once('drain', () => {
                    return this.flush();
                });
            }
        });
    }
    bikeMap(param) {
        if (param.match(/serott/i)) {
            return 'S1';
        }
        else if (param.match(/SP1/i)) {
            return 'SP1';
        }
        else if (param.match(/MTB Thorogood/i)) {
            return 'TG';
        }
        else if (param.match(/MTB2/i)) {
            return 'MTB2';
        }
        else if (param.match(/T1/i)) {
            return 'T1';
        }
        else if (param.match(/tallboy/i)) {
            return 'TB29';
        }
        else if (param.match(/highball1/i)) {
            return 'HB1';
        }
        else if (param.match(/highball/i)) {
            return 'HB1';
        }
        else if (param.match(/orbea/i)) {
            return 'ORB29';
        }
    }
    formatHMS(s, options) {
        options || (options = {});
        let seconds = s % 60;
        let minutes = Math.floor(s / 60) % 60;
        let hours = Math.floor(s / (60 * 60));
        let result = this.pad(hours) + ':';
        result += this.pad(minutes);
        if (options.seconds !== false) {
            result += ':' + this.pad(seconds);
        }
        return result;
    }
    formatMS(s, options) {
        options || (options = {});
        let seconds = s % 60;
        let minutes = Math.floor(s / 60);
        let result = minutes + ':';
        result += this.pad(seconds);
        return result;
    }
    pad(n) {
        return n < 10 ? '0' + n : n;
    }
}
exports.Bikelog = Bikelog;
//# sourceMappingURL=bikelog.js.map