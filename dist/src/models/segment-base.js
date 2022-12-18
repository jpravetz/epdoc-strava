"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SegmentBase = void 0;
const segment_data_1 = require("./segment-data");
class SegmentBase {
    constructor(data) {
        this.isSegmentBase = true;
        Object.assign(this, data);
    }
    static isInstance(val) {
        return val && val.isSegmentBase === true;
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
}
exports.SegmentBase = SegmentBase;
//# sourceMappingURL=segment-base.js.map