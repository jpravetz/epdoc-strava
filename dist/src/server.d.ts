import { StravaApi } from './strava-api';
export declare class Server {
    strava: any;
    server: any;
    result: {
        resolve?: string;
        reject?: string;
    };
    constructor(strava: StravaApi);
    run(): Promise<unknown>;
    close(): void;
}
