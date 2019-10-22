import { StravaCreds } from './strava-creds';
import { Athelete } from './models/athlete';
import { Activity } from './models/activity';
import { StravaApiOpts } from './strava-api';
import { Kml, LineStyle } from './kml';
import { Dict, EpochSeconds } from './util/file';
export declare type SegmentConfig = {
    description: string;
    alias: Dict;
    data: Dict;
};
export declare type StravaConfig = {
    description: string;
    client: StravaApiOpts;
    athleteId: number;
    cachePath?: string;
    lineStyles: Record<string, LineStyle>;
};
export declare type DateRange = {
    before: EpochSeconds;
    after: EpochSeconds;
};
export declare type MainOpts = {
    home: string;
    cwd: string;
    config?: StravaConfig;
    auth?: boolean;
    segmentsFile?: string;
    credentialsFile?: string;
    athlete?: string;
    athleteId?: number;
    bikes?: string[];
    friends?: string[];
    dates?: DateRange[];
    dateRanges?: DateRange[];
    more?: boolean;
    kml?: string;
    xml?: string;
    activities?: string[];
    activityFilter?: string[];
    commuteOnly?: boolean;
    nonCommuteOnly?: boolean;
    imperial?: boolean;
    segments?: boolean | string;
    verbose?: number;
};
export declare class Main {
    options: MainOpts;
    strava: any;
    stravaCreds: StravaCreds;
    kml: Kml;
    athlete: Athelete;
    activities: any[];
    segments: any[];
    segmentsFileLastModified: Date;
    segmentConfig: Record<string, any>;
    gear: any[];
    segmentEfforts: Record<string, any>;
    starredSegment: [];
    constructor(options: MainOpts);
    init(): Promise<void>;
    run(): Promise<void>;
    readSegmentsFile(segmentsFile: string): Promise<void>;
    getAthlete(): Promise<void>;
    logAthlete(): void;
    getActivities(): Promise<Activity[]>;
    getActivitiesForDateRange(dateRange: DateRange): Promise<Activity[]>;
}
