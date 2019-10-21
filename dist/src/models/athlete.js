"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Athelete {
    constructor(data) {
        Object.assign(this, data);
    }
    static newFromResponseData(data) {
        return new Athelete(data);
    }
}
exports.Athelete = Athelete;
//# sourceMappingURL=athlete.js.map