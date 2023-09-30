"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Segment = void 0;
const segment_base_1 = require("./segment-base");
class Segment extends segment_base_1.SegmentBase {
    // more: boolean;
    // efforts: Dict[];
    constructor(data) {
        super(data);
        this._isSegment = true;
    }
    static newFromResponseData(data) {
        return new Segment(data);
    }
    get isSegment() {
        return this._isSegment;
    }
    static isInstance(val) {
        return val && val.isSegment === true;
    }
}
exports.Segment = Segment;
//# sourceMappingURL=segment.js.map