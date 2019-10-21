import { MainOpts } from '../main';
export declare class Activity {
    keys: string[];
    constructor(data: any);
    static newFromResponseData(data: any, opts: MainOpts): Activity;
    static compareStartDate(a: any, b: any): 1 | 0 | -1;
}
