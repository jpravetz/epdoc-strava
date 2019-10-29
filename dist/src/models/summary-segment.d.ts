import { SegmentBase } from './segment-base';
import { StravaCoord } from './../strava-api';
export declare class SummarySegment extends SegmentBase {
    klass: 'SummarySegment';
    coordinates: StravaCoord[];
    country: string;
    state: string;
    constructor(data: any);
    static newFromResponseData(data: any): SummarySegment;
    static isInstance(val: any): val is SummarySegment;
}
