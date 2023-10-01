import { StravaApi } from './strava-api';
import { LogFunctions } from './util';
export declare class Server {
    strava: any;
    server: any;
    result: {
        resolve?: string;
        reject?: string;
    };
    private _log;
    constructor(strava: StravaApi, options: {
        log: LogFunctions;
    });
    run(): Promise<unknown>;
    close(): void;
}
