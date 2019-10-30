"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const segment_base_1 = require("./segment-base");
const segment_data_1 = require("./segment-data");
const epdoc_util_1 = require("epdoc-util");
const util_1 = require("./../util");
const dateutil = __importStar(require("dateutil"));
class SegmentEffort extends segment_base_1.SegmentBase {
    constructor(data) {
        super(data);
        this.klass = 'SegmentEffort';
    }
    static newFromResponseData(data) {
        return new SegmentEffort(data);
    }
    static isInstance(val) {
        return val && epdoc_util_1.isNumber(val.id) && epdoc_util_1.isString(val.country);
    }
    toSegmentData() {
        return new segment_data_1.SegmentData({
            id: this.id,
            name: this.name,
            elapsedTime: this.elapsed_time,
            movingTime: this.moving_time,
            distance: this.distance
        });
    }
    buildKmlDescription() {
        //console.log(this.outputOptions)
        //console.log(segment.keys)
        if (this.more) {
            let arr = [];
            arr.push(SegmentEffort.kvString('Distance', util_1.getDistanceString(this.distance)));
            arr.push(SegmentEffort.kvString('Elevation', util_1.getElevationString(this.elevation_high - this.elevation_low)));
            arr.push(SegmentEffort.kvString('Gradient', util_1.precision(this.average_grade, 100, '%')));
            this.efforts.forEach(effort => {
                let key = effort.start_date_local.replace(/T.*$/, '');
                let value = SegmentEffort.timeString(effort.elapsed_time);
                if (effort.elapsed_time !== effort.moving_time) {
                    value += ' (' + SegmentEffort.timeString(effort.moving_time) + ')';
                }
                arr.push(SegmentEffort.kvString(key, value));
            });
            //console.log(arr);
            return '<![CDATA[' + arr.join('<br>\n') + ']]>';
        }
    }
    static kvString(k, v) {
        return '<b>' + k + ':</b> ' + v;
    }
    static timeString(seconds) {
        return dateutil.formatMS(seconds * 1000, { ms: false, hours: true });
    }
}
exports.SegmentEffort = SegmentEffort;
//# sourceMappingURL=segment-effort.js.map