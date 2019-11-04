import { SegmentName } from './segment-base';
import { StravaCoord } from './../strava-api';
import { Seconds, Metres } from './../util';
import { SegmentId } from './segment';
export declare class SegmentData {
    klass: string;
    id: SegmentId;
    name: SegmentName;
    elapsedTime: Seconds;
    movingTime: Seconds;
    distance: Metres;
    coordinates: StravaCoord[];
    country: string;
    state: string;
    constructor(data: any);
    static isInstance(val: any): val is SegmentData;
}
