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
const epdoc_util_1 = require("epdoc-util");
const util_1 = require("./util");
const builder = __importStar(require("xmlbuilder"));
const fs_1 = __importDefault(require("fs"));
const dateutil = __importStar(require("dateutil"));
class Bikelog {
    constructor(options) {
        this.opts = {};
        this.buffer = '';
        this.bikes = {};
        this.verbose = 9;
        this.opts = options;
        if (epdoc_util_1.isNumber(options.verbose)) {
            this.verbose = options.verbose;
        }
    }
    /**
     * Combine strava activities into per-day information that is suitable for Acroform bikelog.
     * @param activities Array of strava activities.
     * @returns {{}} Dictionary of bikelog data, with keys set to julian day.
     */
    combineActivities(activities) {
        let result = {};
        activities.forEach(activity => {
            let d = new Date(activity.start_date_local);
            let jd = util_1.julianDate(d);
            let entry = result[jd] || { jd: jd, date: new Date(activity.start_date_local), events: [] };
            if (activity.wt) {
                entry.wt = activity.wt;
            }
            if (activity.type === 'Ride') {
                let note = '';
                // note += 'Ascend ' + Math.round(activity.total_elevation_gain) + 'm, time ';
                // note += this.formatHMS(activity.moving_time, { seconds: false });
                // note += ' (' + this.formatHMS(activity.elapsed_time, { seconds: false }) + ')';
                if (activity.commute) {
                    note += 'Commute: ' + activity.name;
                }
                else {
                    note += activity.name;
                }
                if (activity.description) {
                    note += '\n' + activity.description;
                }
                let times = [];
                if (activity.moving_time) {
                    times.push('Moving: ' + this.secondsToString(activity.moving_time));
                }
                if (activity.elapsed_time) {
                    times.push('Elapsed: ' + this.secondsToString(activity.elapsed_time));
                }
                if (times.length) {
                    note += '\n' + times.join(', ');
                }
                if (Array.isArray(activity._segments)) {
                    let segs = [];
                    let up = 'Up ';
                    activity._segments.forEach(segment => {
                        segs.push(up + segment.name + ' [' + util_1.formatMS(segment.movingTime) + ']');
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
                note += ', moving time ' + util_1.formatHMS(activity.moving_time, { seconds: false });
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
    secondsToString(seconds) {
        return dateutil.formatMS(seconds * 1000, { seconds: false, ms: false, hours: true });
    }
    registerBikes(bikes) {
        if (bikes && bikes.length) {
            bikes.forEach(bike => {
                this.bikes[bike.id] = bike;
            });
        }
    }
    outputData(filepath, stravaActivities, bikes) {
        let self = this;
        filepath = filepath ? filepath : 'bikelog.xml';
        let dateString;
        if (Array.isArray(this.opts.dates)) {
            let ad = [];
            this.opts.dates.forEach(range => {
                ad.push(range.after + ' to ' + range.before);
            });
            dateString = ad.join(', ');
        }
        this.buffer = ''; // new Buffer(8*1024);
        this.registerBikes(bikes);
        let activities = this.combineActivities(stravaActivities);
        return new Promise((resolve, reject) => {
            // @ts-ignore
            self.stream = fs_1.default.createWriteStream(filepath);
            // self.stream = fs.createWriteStream('xxx.xml');
            self.stream.once('open', fd => {
                console.log('Open ' + filepath);
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
                    if (activity.wt) {
                        item.ele('wt', activity.wt.replace(/[^\d\.]/g, ''));
                    }
                });
                let s = doc.doc().end({ pretty: true });
                self.stream.write(s);
                self.stream.end();
                console.log(`Wrote ${s.length} bytes to ${filepath}`);
            });
            self.stream.once('error', err => {
                self.stream.end();
                err.message = 'Stream error ' + err.message;
                reject(err);
            });
            self.stream.once('close', () => {
                console.log('Close ' + filepath);
                resolve();
            });
            self.stream.on('finish', () => {
                console.log('Finish ' + filepath);
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
    bikeMap(stravaBikeName) {
        if (Array.isArray(this.opts.bikes)) {
            for (let idx = 0; idx < this.opts.bikes.length; ++idx) {
                const item = this.opts.bikes[idx];
                if (item.pattern.toLowerCase() === stravaBikeName.toLowerCase()) {
                    return item.name;
                }
            }
        }
        return stravaBikeName;
    }
}
exports.Bikelog = Bikelog;
//# sourceMappingURL=bikelog.js.map