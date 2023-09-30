import { SegmentCacheEntry } from './../segment-file';
import { SegmentBase } from './segment-base';
import { StravaCoord } from './../strava-api';
import { Metres } from '../util';
import { Dict } from 'epdoc-util';
export declare class SummarySegment extends SegmentBase {
    private _isSummarySegment;
    coordinates: StravaCoord[];
    average_grade: number;
    elevation_high: Metres;
    elevation_low: Metres;
    country: string;
    state: string;
    constructor(data: Dict);
    static newFromResponseData(data: Dict): SummarySegment;
    get isSummarySegment(): boolean;
    static isInstance(val: any): val is SummarySegment;
    asCacheEntry(): SegmentCacheEntry;
}
