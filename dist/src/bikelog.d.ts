import { DateRange } from './main';
import { Activity } from './models/activity';
import { Dict, Seconds } from './util';
export type BikeDef = {
    name: string;
    pattern: string;
};
export type BikelogOutputOpts = {
    more?: boolean;
    dates?: DateRange[];
    imperial?: boolean;
    segmentsFlatFolder?: boolean;
    selectedBikes?: BikeDef[];
    verbose?: number;
    bikes?: Dict;
};
/**
 * Interface to bikelog XML data that can be read/written from PDF files using
 * Acrobat.
 */
export declare class Bikelog {
    private opts;
    private stream;
    private buffer;
    private verbose;
    constructor(options: BikelogOutputOpts);
    /**
     * Combine strava activities into per-day information that is suitable for Acroform bikelog.
     * @param activities Array of strava activities.
     * @returns {{}} Dictionary of bikelog data, with keys set to julian day.
     */
    private combineActivities;
    static secondsToString(seconds: Seconds): any;
    outputData(filepath: string, stravaActivities: Activity[]): Promise<void>;
    write(indent: any, s: any): void;
    writeln(indent: any, s: any): void;
    flush(): Promise<void>;
    private _flush;
    bikeMap(stravaBikeName: string): string;
}
