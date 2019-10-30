"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const segment_base_1 = require("./segment-base");
class SegmentData {
    constructor(data) {
        this.klass = 'SegmentData';
        this.coordinates = [];
        if (segment_base_1.SegmentBase.isInstance(data)) {
            return data.toSegmentData();
        }
    }
    // static newFromResponseData(data): Segment {
    //   return new Segment(data);
    // }
    static isInstance(val) {
        return val && val.klass === 'SegmentData';
    }
}
exports.SegmentData = SegmentData;
//# sourceMappingURL=segment-data.js.map