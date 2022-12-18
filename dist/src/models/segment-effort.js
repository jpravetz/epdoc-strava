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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SegmentEffort = void 0;
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
        return val && (0, epdoc_util_1.isNumber)(val.id) && (0, epdoc_util_1.isString)(val.country);
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
            arr.push(SegmentEffort.kvString('Distance', (0, util_1.getDistanceString)(this.distance)));
            arr.push(SegmentEffort.kvString('Elevation', (0, util_1.getElevationString)(this.elevation_high - this.elevation_low)));
            arr.push(SegmentEffort.kvString('Gradient', (0, util_1.precision)(this.average_grade, 100, '%')));
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