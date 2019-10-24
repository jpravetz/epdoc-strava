/// <reference types="node" />
import { Activity } from './models/activity';
import { DateRange } from './main';
import { Dict, Seconds } from './util';
import fs from 'fs';
export declare type BikelogOutputOpts = {
    more?: boolean;
    dates?: DateRange[];
    imperial?: boolean;
    segmentsFlatFolder?: boolean;
};
export declare class Bikelog {
    stream: fs.WriteStream;
    buffer: string;
    bikes: Dict;
    options: BikelogOutputOpts;
    verbose: number;
    outputOptions: Dict;
    constructor(options: BikelogOutputOpts);
    /**
     * Combine strava activities into per-day information that is suitable for Acroform bikelog.
     * @param activities Array of strava activities.
     * @returns {{}} Dictionary of bikelog data, with keys set to julian day.
     */
    combineActivities(activities: any): {};
    registerBikes(bikes: any): void;
    outputData(stravaActivities: Activity[], bikes: any, filepath: string): Promise<void>;
    write(indent: any, s: any): void;
    writeln(indent: any, s: any): void;
    flush(): Promise<void>;
    _flush(): Promise<void>;
    bikeMap(param: string): string;
    formatHMS(s: Seconds, options?: any): string;
    formatMS(s: Seconds, options?: any): string;
    pad(n: any): any;
}
