"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const dateutil = __importStar(require("dateutil"));
const epdoc_util_1 = require("epdoc-util");
class Activity {
    constructor(data) {
        this.keys = ['distance', 'total_elevation_gain', 'moving_time', 'elapsed_time', 'average_temp', 'device_name'];
        Object.assign(this, data);
        this.startDate = new Date(this.start_date);
        this._asString = `${this.start_date_local.slice(0, 10)}, ${Math.round(this.distance / 100) / 10} km, ${this.name}`;
    }
    static newFromResponseData(data, main) {
        let result = new Activity(data);
        result.main = main;
        return result;
    }
    toString() {
        return this._asString;
    }
    addFromDetailedActivity(data) {
        console.log('  Adding activity details for ' + this.toString());
        // console.log(data);
        if (data && data.segment_efforts && data.segment_efforts.length) {
            this.addDescription(data);
            return this.addDetailSegments(data);
        }
        else if (data && data.description) {
            this.addDescription(data);
        }
    }
    addDescription(data) {
        if (epdoc_util_1.isString(data.description)) {
            let p = data.description.split(/\r\n/);
            //console.log(p)
            if (p && p.length) {
                let a = [];
                p.forEach(line => {
                    let kv = line.match(/^([^\s\=]+)\s*=\s*(.*)+$/);
                    //console.log(kv)
                    if (kv) {
                        this.keys.push(kv[1]);
                        this[kv[1]] = kv[2];
                    }
                    else {
                        a.push(line);
                    }
                });
                if (a.length) {
                    this.description = a.join('\n');
                }
            }
            else {
                this.description = data.description;
            }
            this.keys.push('description');
        }
    }
    addDetailSegments(data) {
        let ignore = [];
        this.segments = [];
        data.segment_efforts.forEach(effort => {
            // @ts-ignore
            if (Array.isArray(this.main.starredSegment) && this.main.starredSegment.indexOf(effort.name) >= 0) {
                this.addDetailSegment(effort);
            }
        });
    }
    addDetailSegment(segment) {
        let name = String(segment.name).trim();
        if (this.main.segmentConfig && this.main.segmentConfig.alias && this.main.segmentConfig.alias[name]) {
            name = this.main.segmentConfig.alias[name];
            segment.name = name;
        }
        console.log("  Adding segment '" +
            name +
            "', elapsed time " +
            dateutil.formatMS(segment.elapsed_time * 1000, {
                ms: false,
                hours: true
            }));
        // Add segment to this activity
        this.segments.push(epdoc_util_1.pick(segment, 'id', 'name', 'elapsed_time', 'moving_time', 'distance'));
    }
    include(filter) {
        if ((!filter.commuteOnly && !filter.nonCommuteOnly) ||
            (filter.commuteOnly && this.commute) ||
            (filter.nonCommuteOnly && !this.commute)) {
            if (Array.isArray(filter.exclude)) {
                if (filter.exclude.indexOf(this.type) >= 0) {
                    return false;
                }
            }
            if (Array.isArray(filter.include)) {
                if (filter.include.indexOf(this.type) < 0) {
                    return false;
                }
            }
            return true;
        }
        return false;
    }
    static compareStartDate(a, b) {
        if (a.start_date < b.start_date) {
            return -1;
        }
        if (a.start_date > b.start_date) {
            return 1;
        }
        return 0;
    }
}
exports.Activity = Activity;
//# sourceMappingURL=activity.js.map