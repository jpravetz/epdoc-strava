import { SegmentData } from './segment-data';
import { Seconds, Metres } from './../util';
import { SegmentId } from './segment';
import { Dict } from 'epdoc-util';
export type SegmentName = string;
export declare class SegmentBase {
    private _isSegmentBase;
    id: SegmentId;
    name: SegmentName;
    elapsed_time: Seconds;
    moving_time: Seconds;
    distance: Metres;
    constructor(data: Dict);
    get isSegmentBase(): boolean;
    static isInstance(val: any): val is SegmentBase;
    toSegmentData(): SegmentData;
}
