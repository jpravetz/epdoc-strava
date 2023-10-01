"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StravaCreds = exports.isStravaCredsData = void 0;
const epdoc_util_1 = require("epdoc-util");
const util_1 = require("./util");
const fs_1 = __importDefault(require("fs"));
function isStravaCredsData(val) {
    if ((0, epdoc_util_1.isDict)(val) && (0, epdoc_util_1.isNonEmptyString)(val.token_type) && (0, util_1.isEpochSeconds)(val.expires_at)) {
        return true;
    }
    return false;
}
exports.isStravaCredsData = isStravaCredsData;
/**
 * Strava token file containing OAUTH credentials.
 */
const defaultStravaToken = {
    token_type: null,
    expires_at: 0,
    expires_in: 0,
    refresh_token: null,
    access_token: null,
    athlete: {},
};
class StravaCreds {
    constructor(tokenFile, opts) {
        this._data = defaultStravaToken;
        this._path = tokenFile;
        this._log = opts.log;
    }
    get expiresAt() {
        return this._data.expires_at;
    }
    get refreshToken() {
        return this._data.refresh_token;
    }
    get accessToken() {
        return this._data.access_token;
    }
    areValid(t = 2 * 60 * 60) {
        const tLimit = Date.now() / 1000 + t;
        return this._data && this._data.token_type === 'Bearer' && this._data.expires_at > tLimit;
    }
    static validCredData(val) {
        return val && val.token_type === 'Bearer' && (0, epdoc_util_1.isNumber)(val.expires_at);
    }
    read() {
        return __awaiter(this, void 0, void 0, function* () {
            if (fs_1.default.existsSync(this._path)) {
                try {
                    const resp = yield (0, util_1.readJson)(this._path);
                    if (StravaCreds.validCredData(resp)) {
                        this._data = resp;
                    }
                    else {
                        this._log.error('Invalid token auth response');
                    }
                }
                catch (err) {
                    this._log.error('No local credentials cached');
                    return yield Promise.resolve();
                }
            }
        });
    }
    write(data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (StravaCreds.validCredData(data)) {
                this._data = data;
                return (0, util_1.writeJson)(this._path, this._data);
            }
            else {
                throw new Error('No token data to write');
            }
        });
    }
}
exports.StravaCreds = StravaCreds;
//# sourceMappingURL=strava-creds.js.map