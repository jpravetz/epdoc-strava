import { SummarySegment } from './models/summary-segment';
import { StravaCreds } from './strava-creds';
import { Athelete } from './models/athlete';
import { Activity } from './models/activity';
import { StravaClientConfig } from './strava-api';
import { Kml, LineStyle } from './kml';
import { Dict, EpochSeconds } from './util';
import { BikeDef } from './bikelog';
import { SegmentData } from './models/segment-data';
export declare type SegmentConfig = {
    description: string;
    alias: Dict;
    data: Dict;
};
export declare type StravaConfig = {
    description: string;
    client: StravaClientConfig;
    athleteId?: number;
    cachePath?: string;
    lineStyles?: Record<string, LineStyle>;
    bikes?: BikeDef[];
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
    activities: Activity[];
    segments: SummarySegment[];
    segmentsFileLastModified: Date;
    segmentConfig: Record<string, any>;
    gear: any[];
    segmentEfforts: Record<string, any>;
    starredSegments: SegmentData[];
    constructor(options: MainOpts);
    init(): Promise<void>;
    run(): Promise<void>;
    /**
     * Read a local file that contains segment name aliases
     */
    readSegmentsConfigFile(segmentsFile: string): Promise<void>;
    getAthlete(): Promise<void>;
    logAthlete(): void;
    getActivities(): Promise<Activity[]>;
    getActivitiesForDateRange(dateRange: DateRange): Promise<Activity[]>;
    filterActivities(activities: Activity[]): Activity[];
    getStarredSegmentList(): Promise<void>;
    /**
     * Read more information using the DetailedActivity object and add these
     * details to the Activity object.
     */
    addActivitiesDetails(): Promise<any>;
    addActivityDetail(activity: Activity): Promise<void>;
    /**
     * Add coordinates for the activity or segment.
     */
    addActivitiesCoordinates(): Promise<void>;
    addStarredSegmentsCoordinates(): Promise<void>;
    saveXml(): Promise<void>;
    saveKml(options?: {
        activities?: boolean;
        segments?: boolean;
    }): Promise<void>;
}