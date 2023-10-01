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
exports.Server = void 0;
const koa_1 = __importDefault(require("koa"));
const koa_router_1 = __importDefault(require("koa-router"));
const open_1 = __importDefault(require("open"));
class Server {
    constructor(strava, options) {
        this.result = {};
        this.strava = strava;
        this._log = options.log;
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const app = new koa_1.default();
                const router = new koa_router_1.default();
                let authOpts = {
                    redirectUri: 'http://localhost:3000/token',
                };
                const authUrl = this.strava.getAuthorizationUrl(authOpts);
                router.get('/token', (ctx) => __awaiter(this, void 0, void 0, function* () {
                    const code = ctx.query.code;
                    const err = ctx.query.error;
                    let s = '<html><body><h1>Credential Exchange</h1>';
                    return Promise.resolve()
                        .then((resp) => {
                        if (err === 'access_denied') {
                            s += '<p>Error, access denied</p>';
                        }
                        else {
                            s += `<p>Authorization code: ${code}</p>`;
                            return this.strava
                                .getTokens(code)
                                .then((resp) => {
                                s += '<p>Tokens retrieved. Please return to command line.</p>';
                                s += '</body></html>';
                                ctx.body = s;
                                this.result = { resolve: 'Tokens retrieved and saved to file' };
                            })
                                .catch((err) => {
                                s += `<p>Error retrieving tokens: ${err.message}</p>`;
                                s += '</body></html>';
                                ctx.body = s;
                                this.result = { reject: 'Could not retrieve tokens: ' + err.message };
                            });
                        }
                    })
                        .then((resp) => {
                        s += '</body></html>';
                        ctx.body = s;
                    });
                }));
                // This code was causing a problem when I updated koa, and is not needed,
                // so I am commenting it out. router.get('/*', ctx => { ctx.body =
                // `<html><body><a href="${authUrl}">Click to
                // authenticate</a></body></html>`;
                // });
                app.use(router.routes());
                let server = app.listen(3000);
                this._log.info('Server running on port 3000');
                (0, open_1.default)(authUrl, { wait: true }).then((resp) => {
                    this._log.info('browser is open');
                });
                let timer = setInterval(() => {
                    this._log.info('Waiting ...');
                    if (this.result.resolve) {
                        clearInterval(timer);
                        timer = undefined;
                        this._log.info('Closing server ' + this.result.resolve);
                        this.close();
                        resolve(this.result.resolve);
                    }
                    else if (this.result.reject) {
                        clearInterval(timer);
                        timer = undefined;
                        this._log.info('Closing server ' + this.result.reject);
                        this.close();
                        reject(new Error(this.result.reject));
                    }
                }, 1000);
            });
        });
    }
    close() {
        if (this.server) {
            this.server.close();
        }
        this.server = undefined;
    }
}
exports.Server = Server;
//# sourceMappingURL=server.js.map