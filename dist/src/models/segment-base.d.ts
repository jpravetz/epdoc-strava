import { SegmentData } from './segment-data';
import { Seconds, Metres } from './../util';
import { SegmentId } from './segment';
export declare type SegmentName = string;
export declare class SegmentBase {
    isSegmentBase: boolean;
    id: SegmentId;
    name: SegmentName;
    elapsed_time: Seconds;
    moving_time: Seconds;
    distance: Metres;
    constructor(data: any);
    static isInstance(val: any): val is SegmentBase;
    toSegmentData(): SegmentData;
}
