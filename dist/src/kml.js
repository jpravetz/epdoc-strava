"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const epdoc_util_1 = require("epdoc-util");
const REGEX = {
    color: /^[a-zA-Z0-9]{8}$/
};
class Kml {
    constructor(opts = {}) {
        this.verbose = opts.verbose;
    }
    setLineStyles(styles) {
        Object.keys(styles).forEach(name => {
            const style = styles[name];
            if (style && epdoc_util_1.isString(style.color) && epdoc_util_1.isNumber(style.width) && REGEX.color.test(style.color)) {
                this.lineStyles[name] = style;
            }
            else {
                console.log('Warning: ignoring line style error for %s. Style must be in form \'{ "color": "C03030C0", "width": 2 }\'', name);
            }
        });
    }
}
exports.Kml = Kml;
//# sourceMappingURL=kml.js.map