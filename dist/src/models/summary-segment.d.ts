import { SegmentCacheEntry } from './../segment-file';
import { SegmentBase } from './segment-base';
import { StravaCoord } from './../strava-api';
import { Metres } from '../util';
export declare class SummarySegment extends SegmentBase {
    klass: 'SummarySegment';
    coordinates: StravaCoord[];
    average_grade: number;
    elevation_high: Metres;
    elevation_low: Metres;
    country: string;
    state: string;
    constructor(data: any);
    static newFromResponseData(data: any): SummarySegment;
    static isInstance(val: any): val is SummarySegment;
    asCacheEntry(): SegmentCacheEntry;
}
