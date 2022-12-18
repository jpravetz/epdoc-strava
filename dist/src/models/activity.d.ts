import { Dict } from 'epdoc-util';
import { Main } from '../main';
import { StravaCoord } from './../strava-api';
import { IsoDateString, Kilometres, Metres, Seconds } from './../util';
import { DetailedActivity } from './detailed-activity';
import { SegmentData } from './segment-data';
export type ActivityFilter = {
    commuteOnly?: boolean;
    nonCommuteOnly?: boolean;
    include?: string[];
    exclude?: string[];
};
export declare class Activity {
    keys: string[];
    keyDict: Dict;
    data: Dict;
    description: string;
    main: Main;
    commute: boolean;
    startDate: Date;
    private _asString;
    private _segments;
    private _coordinates;
    constructor(data: Dict);
    static newFromResponseData(data: Dict, main: Main): Activity;
    static isInstance(val: any): val is Activity;
    toString(): string;
    get coordinates(): StravaCoord[];
    set coordinates(val: StravaCoord[]);
    get name(): string;
    get id(): number;
    get movingTime(): Seconds;
    get elapsedTime(): Seconds;
    get distance(): Metres;
    distanceRoundedKm(): Kilometres;
    get totalElevationGain(): Metres;
    get averageTemp(): number;
    get deviceName(): string;
    get gearId(): string;
    get startDateLocal(): IsoDateString;
    get segments(): SegmentData[];
    get type(): string;
    isRide(): boolean;
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
    static compareStartDate(a: Activity, b: Activity): 0 | 1 | -1;
}
