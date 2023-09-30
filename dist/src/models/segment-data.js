"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SegmentData = void 0;
const segment_base_1 = require("./segment-base");
class SegmentData {
    constructor(data) {
        this._isSegmentData = true;
        this.coordinates = [];
        if (segment_base_1.SegmentBase.isInstance(data)) {
            return data.toSegmentData();
        }
        else {
            this.id = data.id;
            this.name = data.name;
            this.elapsedTime = data.elapsed_time;
            this.movingTime = data.moving_time;
            this.distance = data.distance;
        }
    }
    // static newFromResponseData(data): Segment {
    //   return new Segment(data);
    // }
    get isSegmentData() {
        return this._isSegmentData;
    }
    static isInstance(val) {
        return val && val.isSegmentData;
    }
}
exports.SegmentData = SegmentData;
//# sourceMappingURL=segment-data.js.map