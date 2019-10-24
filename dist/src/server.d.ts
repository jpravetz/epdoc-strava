import { StravaApi } from './strava-api';
export declare class Server {
    strava: any;
    server: any;
    constructor(strava: StravaApi);
    run(): Promise<unknown>;
    close(): void;
}
