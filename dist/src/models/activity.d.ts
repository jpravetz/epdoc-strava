import { Metres, IsoDateString } from './../util';
import { Main } from '../main';
import { Dict } from '../util';
export declare type DetailedActivity = {
    description?: string;
    segment_efforts?: Dict[];
};
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
    segments: Dict[];
    main: Main;
    commute: boolean;
    type: string;
    distance: Metres;
    startDate: Date;
    start_date: IsoDateString;
    start_date_local: IsoDateString;
    _asString: string;
    constructor(data: any);
    static newFromResponseData(data: any, main: Main): Activity;
    toString(): string;
    addFromDetailedActivity(data: DetailedActivity): void;
    addDescription(data: DetailedActivity): void;
    addDetailSegments(data: DetailedActivity): void;
    addDetailSegment(segment: Dict): void;
    include(filter: ActivityFilter): boolean;
    static compareStartDate(a: any, b: any): 1 | 0 | -1;
}
