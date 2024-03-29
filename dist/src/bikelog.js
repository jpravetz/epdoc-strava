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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Bikelog = void 0;
const dateutil = __importStar(require("dateutil"));
const epdoc_util_1 = require("epdoc-util");
const fs_1 = __importDefault(require("fs"));
const builder = __importStar(require("xmlbuilder"));
const util_1 = require("./util");
const REGEX = {
    moto: /^moto$/i
};
/**
 * Interface to bikelog XML data that can be read/written from PDF files using
 * Acrobat.
 */
class Bikelog {
    constructor(options) {
        this.opts = {};
        this.buffer = '';
        this.verbose = 9;
        this.opts = options;
        if ((0, epdoc_util_1.isNumber)(options.verbose)) {
            this.verbose = options.verbose;
        }
    }
    /**
     * Combine strava activities into per-day information that is suitable for Acroform bikelog.
     * @param activities Array of strava activities.
     * @returns {{}} Dictionary of bikelog data, with keys set to julian day.
     */
    combineActivities(activities) {
        const result = {};
        activities.forEach(activity => {
            const d = new Date(activity.startDateLocal);
            const jd = (0, util_1.julianDate)(d);
            const entry = result[jd] || { jd: jd, date: new Date(activity.startDateLocal), events: [] };
            if (activity.data.wt) {
                entry.wt = activity.data.wt;
            }
            if (activity.isRide()) {
                const bike = activity.gearId ? this.opts.bikes[activity.gearId] : undefined;
                const isMoto = bike ? REGEX.moto.test(bike.name) : false;
                let note = '';
                // note += 'Ascend ' + Math.round(activity.total_elevation_gain) + 'm, time ';
                // note += this.formatHMS(activity.moving_time, { seconds: false });
                // note += ' (' + this.formatHMS(activity.elapsed_time, { seconds: false }) + ')';
                const times = [];
                if (activity.movingTime) {
                    times.push('Moving: ' + Bikelog.secondsToString(activity.movingTime));
                }
                if (activity.elapsedTime) {
                    times.push('Elapsed: ' + Bikelog.secondsToString(activity.elapsedTime));
                }
                if (isMoto) {
                    note += 'Moto: ' + activity.name;
                    note += `\nDistance: ${activity.distanceRoundedKm()}, Elevation: ${Math.round(activity.totalElevationGain)}`;
                }
                else if (activity.commute) {
                    note += 'Commute: ' + activity.name;
                }
                else if (activity.type === 'EBikeRide') {
                    note += 'EBike: ' + activity.name;
                }
                else {
                    note += 'Bike: ' + activity.name;
                }
                note += times.length ? '\n' + times.join(', ') : '';
                if (!isMoto && activity.type === 'EBikeRide') {
                    if (activity.data.kilojoules) {
                        note += '\nBiker Energy: ' + Math.round(activity.data.kilojoules / 3.6) + ' Wh';
                        if (activity.data.max_watts) {
                            note += '; Max: ' + activity.data.max_watts + ' W';
                        }
                    }
                }
                if (activity.description) {
                    note += '\n' + activity.description;
                }
                if (Array.isArray(activity.segments)) {
                    const segs = [];
                    let up = 'Up ';
                    activity.segments.forEach(segment => {
                        segs.push(up + segment.name + ' [' + (0, util_1.formatMS)(segment.movingTime) + ']');
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
                if (bike && !isMoto) {
                    dobj = {
                        distance: activity.distanceRoundedKm(),
                        bike: this.bikeMap(bike.name),
                        el: Math.round(activity.totalElevationGain),
                        t: Math.round(activity.movingTime / 36) / 100,
                        wh: Math.round(activity.data.kilojoules / 3.6)
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
                const distance = Math.round(activity.distance / 10) / 100;
                let note = activity.type + ': ' + activity.name + '\n';
                note += 'Distance: ' + distance + ' km; Duration: ' + (0, util_1.formatHMS)(activity.movingTime, { seconds: false });
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
    static secondsToString(seconds) {
        return dateutil.formatMS(seconds * 1000, { seconds: false, ms: false, hours: true });
    }
    outputData(filepath, stravaActivities) {
        const self = this;
        filepath = filepath ? filepath : 'bikelog.xml';
        let dateString;
        if (Array.isArray(this.opts.dates)) {
            const ad = [];
            this.opts.dates.forEach(range => {
                ad.push(range.after + ' to ' + range.before);
            });
            dateString = ad.join(', ');
        }
        this.buffer = ''; // new Buffer(8*1024);
        const activities = this.combineActivities(stravaActivities);
        return new Promise((resolve, reject) => {
            // @ts-ignore
            self.stream = fs_1.default.createWriteStream(filepath);
            // self.stream = fs.createWriteStream('xxx.xml');
            self.stream.once('open', fd => {
                console.log('Open ' + filepath);
                const doc = builder
                    .create('fields', { version: '1.0', encoding: 'UTF-8' })
                    .att('xmlns:xfdf', 'http://ns.adobe.com/xfdf-transition/')
                    .ele('day');
                Object.keys(activities).forEach(key => {
                    const activity = activities[key];
                    const item = doc.ele('group').att('xfdf:original', activity.jd);
                    for (let idx = 0; idx < Math.min(activity.events.length, 2); ++idx) {
                        const event = activity.events[idx];
                        if (event) {
                            const group = item.ele('group').att('xfdf:original', idx);
                            group.ele('bike', event.bike);
                            group.ele('dist', event.distance);
                            group.ele('el', event.el);
                            group.ele('t', event.t);
                            group.ele('wh', event.wh);
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
                const s = doc.doc().end({ pretty: true });
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
            const indent2 = new Array(indent + 1).join('  ');
            this.buffer += indent2 + s;
        }
        // this.buffer.write( indent + s, 'utf8' );
    }
    writeln(indent, s) {
        if (typeof indent === 'string') {
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
            const bOk = this.stream.write(this.buffer);
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
        if (Array.isArray(this.opts.selectedBikes)) {
            for (let idx = 0; idx < this.opts.selectedBikes.length; ++idx) {
                const item = this.opts.selectedBikes[idx];
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