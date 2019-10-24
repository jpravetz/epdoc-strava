import { StravaApi } from './strava-api';
export declare class Server {
    strava: any;
    constructor(strava: StravaApi);
    run(): Promise<unknown>;
}
