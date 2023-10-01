import { Dict } from 'epdoc-util';
import { DateRange } from './main';
import { Activity } from './models/activity';
import { LogOpts, Seconds } from './util';
export type BikeDef = {
    name: string;
    pattern: string;
};
export type BikelogOutputOpts = LogOpts & {
    more?: boolean;
    dates?: DateRange[];
    imperial?: boolean;
    segmentsFlatFolder?: boolean;
    selectedBikes?: BikeDef[];
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
    private _log;
    constructor(options: BikelogOutputOpts);
    /**
     * Combine strava activities into per-day information that is suitable for Acroform bikelog.
     * @param activities Array of strava activities.
     * @returns {{}} Dictionary of bikelog data, with keys set to julian day.
     */
    private combineActivities;
    static secondsToString(seconds: Seconds): string;
    outputData(filepath: string, stravaActivities: Activity[]): Promise<void>;
    write(indent: any, s: any): void;
    writeln(indent: any, s: any): void;
    flush(): Promise<void>;
    private _flush;
    bikeMap(stravaBikeName: string): string;
}
