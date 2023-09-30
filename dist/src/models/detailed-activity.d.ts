import { Dict } from 'epdoc-util';
import { SegmentEffort } from './segment-effort';
/**
 * We fetch DetailedActivity from Strava and pick data from this object and add
 * it to Activity object.
 */
export declare class DetailedActivity {
    description?: string;
    segment_efforts?: SegmentEffort[];
    constructor(data: Dict);
    static newFromResponseData(data: any): DetailedActivity;
    static isInstance(val: any): val is DetailedActivity;
}
