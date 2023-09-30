"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SegmentEffort = void 0;
const epdoc_timeutil_1 = require("epdoc-timeutil");
const util_1 = require("./../util");
const segment_base_1 = require("./segment-base");
const segment_data_1 = require("./segment-data");
class SegmentEffort extends segment_base_1.SegmentBase {
    constructor(data) {
        super(data);
        this._isSegmentEffort = true;
    }
    static newFromResponseData(data) {
        return new SegmentEffort(data);
    }
    get isSegmentEffort() {
        return this._isSegmentEffort;
    }
    static isInstance(val) {
        return val && val.isSegmentEffort;
    }
    toSegmentData() {
        return new segment_data_1.SegmentData({
            id: this.id,
            name: this.name,
            elapsedTime: this.elapsed_time,
            movingTime: this.moving_time,
            distance: this.distance,
        });
    }
    buildKmlDescription() {
        //console.log(this.outputOptions)
        //console.log(segment.keys)
        if (this.more) {
            let arr = [];
            arr.push(SegmentEffort.kvString('Distance', (0, util_1.getDistanceString)(this.distance)));
            arr.push(SegmentEffort.kvString('Elevation', (0, util_1.getElevationString)(this.elevation_high - this.elevation_low)));
            arr.push(SegmentEffort.kvString('Gradient', (0, util_1.precision)(this.average_grade, 100, '%')));
            this.efforts.forEach((effort) => {
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
        return (0, epdoc_timeutil_1.durationUtil)(seconds * 1000).format({ ms: false });
    }
}
exports.SegmentEffort = SegmentEffort;
//# sourceMappingURL=segment-effort.js.map