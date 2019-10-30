import { StravaCoord } from './../strava-api';
import { DetailedActivity } from './detailed-activity';
import { Metres, IsoDateString } from './../util';
import { Main } from '../main';
import { SegmentEffort } from './segment-effort';
import { SegmentData } from './segment-data';
export declare type ActivityFilter = {
    commuteOnly?: boolean;
    nonCommuteOnly?: boolean;
    include?: string[];
    exclude?: string[];
};
export declare class Activity {
    keys: string[];
    id: number;
    name: string;
    description: string;
    main: Main;
    commute: boolean;
    type: string;
    distance: Metres;
    startDate: Date;
    start_date: IsoDateString;
    start_date_local: IsoDateString;
    _asString: string;
    _segments: SegmentData[];
    _coordinates: StravaCoord[];
    constructor(data: any);
    static newFromResponseData(data: any, main: Main): Activity;
    static isInstance(val: any): val is Activity;
    toString(): string;
    hasKmlData(): boolean;
    /**
     * Get starred segment_efforts and descriptions from the DetailedActivity
     * object and add to Acivity.
     * @param data
     */
    addFromDetailedActivity(data: DetailedActivity): void;
    _addDescriptionFromDetailedActivity(data: DetailedActivity): void;
    _addDetailSegmentsFromDetailedActivity(data: DetailedActivity): void;
    _addDetailSegment(segEffort: SegmentEffort): void;
    include(filter: ActivityFilter): boolean;
    static compareStartDate(a: any, b: any): 1 | -1 | 0;
}
