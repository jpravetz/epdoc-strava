import { Metres } from './../util';
export type StravaBike = {
    id?: string;
    primary?: boolean;
    name?: string;
    distance?: Metres;
};
export declare class Athelete {
    bikes: StravaBike[];
    id: number;
    username: string;
    constructor(data: any);
    static newFromResponseData(data: any): Athelete;
    static isInstance(val: any): val is Athelete;
}
