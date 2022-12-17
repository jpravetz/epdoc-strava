import { Dict } from 'epdoc-util';
import { Main } from '../main';
import { StravaCoord } from './../strava-api';
import { IsoDateString, Metres, Seconds } from './../util';
import { DetailedActivity } from './detailed-activity';
import { SegmentData } from './segment-data';
export declare type ActivityFilter = {
    commuteOnly?: boolean;
    nonCommuteOnly?: boolean;
    include?: string[];
    exclude?: string[];
};
export declare class Activity {
    keys: string[];
    keyDict: Dict;
    data: Dict;
    id: number;
    name: string;
    description: string;
    main: Main;
    commute: boolean;
    distance: Metres;
    startDate: Date;
    private _asString;
    private _segments;
    private _coordinates;
    constructor(data: Dict);
    static newFromResponseData(data: Dict, main: Main): Activity;
    static isInstance(val: any): val is Activity;
    toString(): string;
    readonly coordinates: StravaCoord[];
    readonly movingTime: Seconds;
    readonly elapsedTime: Seconds;
    readonly totalElevationGain: Metres;
    readonly averageTemp: number;
    readonly deviceName: string;
    readonly gearId: string;
    readonly startDateLocal: IsoDateString;
    readonly segments: SegmentData[];
    readonly type: string;
    isRide(): boolean;
    isMoto(): boolean;
    hasKmlData(): boolean;
    /**
     * Get starred segment_efforts and descriptions from the DetailedActivity
     * object and add to Acivity.
     * @param data
     */
    addFromDetailedActivity(data: DetailedActivity): void;
    private _addDescriptionFromDetailedActivity;
    private _addDetailSegmentsFromDetailedActivity;
    private _addDetailSegment;
    include(filter: ActivityFilter): boolean;
    static compareStartDate(a: any, b: any): 1 | -1 | 0;
}
