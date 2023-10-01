"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTemperatureString = exports.getElevationString = exports.getDistanceString = exports.escapeHtml = exports.fieldCapitalize = exports.precision = exports.writeJson = exports.readJson = exports.isLogFunctions = exports.isLogFunction = exports.isEpochSeconds = exports.isFileName = exports.isFolderPath = exports.isFilePath = exports.compare = void 0;
const epdoc_util_1 = require("epdoc-util");
const fs_1 = __importDefault(require("fs"));
function compare(a, b, key) {
    if (a[key] < b[key]) {
        return -1;
    }
    if (a[key] > b[key]) {
        return 1;
    }
    return 0;
}
exports.compare = compare;
function isFilePath(val) {
    return (0, epdoc_util_1.isNonEmptyString)(val);
}
exports.isFilePath = isFilePath;
function isFolderPath(val) {
    return (0, epdoc_util_1.isNonEmptyString)(val);
}
exports.isFolderPath = isFolderPath;
function isFileName(val) {
    return (0, epdoc_util_1.isNonEmptyString)(val);
}
exports.isFileName = isFileName;
function isEpochSeconds(val) {
    return (0, epdoc_util_1.isInteger)(val) && val >= 0;
}
exports.isEpochSeconds = isEpochSeconds;
function isLogFunction(val) {
    return (0, epdoc_util_1.isFunction)(val);
}
exports.isLogFunction = isLogFunction;
function isLogFunctions(val) {
    return ((0, epdoc_util_1.isDict)(val) &&
        isLogFunction(val.info) &&
        isLogFunction(val.warn) &&
        isLogFunction(val.error) &&
        isLogFunction(val.debug) &&
        isLogFunction(val.verbose));
}
exports.isLogFunctions = isLogFunctions;
// export function formatHMS(s: Seconds, options?: formatHMSOpts): string {
//   options || (options = {});
//   const seconds = s % 60;
//   const minutes = Math.floor(s / 60) % 60;
//   const hours = Math.floor(s / (60 * 60));
//   let result = pad(hours, 2) + ':';
//   result += pad(minutes, 2);
//   if (options.seconds !== false) {
//     result += ':' + pad(seconds, 2);
//   }
//   return result;
// }
// export function formatMS(s: Seconds): string {
//   const seconds = s % 60;
//   const minutes = Math.floor(s / 60);
//   let result = minutes + ':';
//   result += pad(seconds, 2);
//   return result;
// }
function readJson(path) {
    return new Promise((resolve, reject) => {
        fs_1.default.readFile(path, 'utf8', (err, data) => {
            if (err) {
                reject(err);
            }
            else {
                try {
                    let json = JSON.parse(data.toString());
                    resolve(json);
                }
                catch (error) {
                    reject(error);
                }
            }
        });
    });
}
exports.readJson = readJson;
function writeJson(path, data) {
    return new Promise((resolve, reject) => {
        const buf = Buffer.from(JSON.stringify(data, null, '  '));
        fs_1.default.writeFile(path, buf, (err) => {
            if (err) {
                reject(err);
            }
            else {
                resolve();
            }
        });
    });
}
exports.writeJson = writeJson;
function precision(num, r, unit) {
    return String(Math.round(num * r) / r) + unit;
}
exports.precision = precision;
function fieldCapitalize(name) {
    return name
        .replace(/^([a-z])/, function ($1) {
        return $1.toUpperCase();
    })
        .replace(/(\_[a-z])/g, function ($1) {
        return $1.toUpperCase().replace('_', ' ');
    });
}
exports.fieldCapitalize = fieldCapitalize;
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
exports.escapeHtml = escapeHtml;
function getDistanceString(value, imperial = false) {
    if (imperial) {
        return precision(value / 1609.344, 100, ' miles');
    }
    else {
        return precision(value / 1000, 100, ' km');
    }
}
exports.getDistanceString = getDistanceString;
function getElevationString(value, imperial = false) {
    if (imperial) {
        return precision(value / 0.3048, 1, ' ft');
    }
    else {
        return precision(value, 1, ' m');
    }
}
exports.getElevationString = getElevationString;
function getTemperatureString(value, imperial = false) {
    if (imperial) {
        return precision((value * 9) / 5 + 32, 1, '&deg;F');
    }
    else {
        return value + '&deg;C';
    }
}
exports.getTemperatureString = getTemperatureString;
//# sourceMappingURL=util.js.map