import { Dict } from 'epdoc-util';
import { Bikelog, BikelogOutputOpts } from './bikelog';
import { Kml, KmlOpts } from './kml';
import { Activity, ActivityFilter } from './models/activity';
import { StravaBike } from './models/athlete';
import { SegmentData } from './models/segment-data';
import { SummarySegment } from './models/summary-segment';
import { SegmentCacheFile } from './segment-cache-file';
import { StravaStreamSource, isStravaClientSecret } from './strava-api';
import { StravaConfig } from './strava-config';
import { DateRange, GetSegmentsOpts, StravaContext } from './strava-context';
import { FilePath, LogFunctions } from './util';

// let _ = require('underscore');
// let async = require('async');
// let dateutil = require('dateutil');
// let Strava = require('../lib/stravaV3api');
// let Bikelog = require('../lib/bikelog');

const REQ_LIMIT = 10;

export type SegmentConfig = {
  description: string;
  alias: Dict;
  data: Dict;
};

export type MainOpts = {
  home: string;
  cwd: string;
  config?: StravaConfig;
  auth?: boolean;
  refreshStarredSegments?: boolean;
  segmentsCachePath: FilePath;
  credentialsFile?: FilePath;
  athlete?: string;
  athleteId?: number;
  selectedBikes?: string[];
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
  log?: LogFunctions;
};

export class Main {
  private options: MainOpts;
  private _config: StravaConfig;
  private kml: Kml;
  private segments: SummarySegment[];
  private segmentsFileLastModified: Date;
  private segmentConfig: Record<string, any>;
  private gear: any[];
  private segmentEfforts: Record<string, any>;
  private starredSegments: SegmentData[] = [];
  public strava: StravaContext;
  private _log: LogFunctions;

  constructor(options: MainOpts) {
    this.options = options;
    this._config = options.config;
    this._log = options.log
      ? options.log
      : { info: (msg) => {}, debug: (msg) => {}, error: (msg) => {}, warn: (msg) => {}, verbose: (msg) => {} };
  }

  public async init(): Promise<void> {
    if (isStravaClientSecret(this.config.client)) {
      this.strava = new StravaContext(this.config.client, this.config.credentials, { log: this._log });
      return Promise.resolve()
        .then((resp) => {
          if (this.options.kml) {
            // Run this first to validate line styles before pinging strava APIs
            this.kml = new Kml({ log: this.log });
            if (this.options.config.lineStyles) {
              this.kml.setLineStyles(this.options.config.lineStyles);
            }
          }
        })
        .then((resp) => {
          return this.strava.auth();
        });
    } else {
      return Promise.reject(new Error('Config does not contain client id and secret'));
    }
  }

  public async auth(): Promise<void> {
    return this.init();
  }

  public get config(): StravaConfig {
    return this._config;
  }

  public get log(): LogFunctions {
    return this._log;
  }

  public async run(): Promise<void> {
    return this.auth()
      .then((resp) => {
        const segOpts: GetSegmentsOpts = {
          cacheFilePath:this._config.segmentsCachePath,
          refresh: this.options.refreshStarredSegments
        }
        return this.strava.getStarredSegments(segOpts);
        // return this.strava.getSegments(this._config.segmentsCachePath,{ refresh: this.options.refreshStarredSegments });
      })
      .then((resp) => {
        if (this.options.kml && !this.options.activities && !this.options.segments) {
          throw new Error('When writing kml select either segments, activities or both');
        }
      })
      .then((resp) => {
        if (this.options.athlete || this.options.xml || this.options.kml) {
          return this.strava.getAthlete(this.options.athleteId).then((resp) => {
            if (!this.options.xml) {
              this.logAthlete();
            }
          });
        }
      })
      .then((resp) => {
        if (this.options.activities || this.options.xml) {
          return this.strava.getActivities(this.options.dates, { log: this._log }).then((resp) => {
            const filter: ActivityFilter = {
              commuteOnly: this.options.commuteOnly,
              nonCommuteOnly: this.options.nonCommuteOnly,
              include: this.options.activityFilter,
            };
            this.strava.filterActivities(filter);

            this._log.info(`Found ${this.strava.activities.length} Activities`);
            if (!this.options.xml) {
              this.strava.activities.forEach((i) => {
                this._log.info('  ' + i.toString());
              });
            }
          });
        }
      })
      .then((resp) => {
        if (this.options.xml) {
          return this.strava.addActivitiesDetails();
        }
      })
      .then((resp) => {
        if (this.options.xml) {
          return this.saveXml();
        }
      })
      .then((resp) => {
        if (this.options.kml && this.options.activities) {
          return this.strava.addActivitiesCoordinates();
        }
      })
      .then((resp) => {
        if (this.options.kml && this.options.segments) {
          return this.addStarredSegmentsCoordinates();
        }
      })
      .then((resp) => {
        if (this.options.kml) {
          let opts = {
            activities: true,
            segments: this.options.segments ? true : false,
          };
          return this.saveKml(opts);
        }
      });
  }

  public logAthlete() {
    this._log.info('Athlete ' + JSON.stringify(this.strava.athlete, null, '  '));
  }


  /**
   * Call only when generating KML file with all segments
   */
  private async addStarredSegmentsCoordinates() {
    this._log.info(`Retrieving coordinates for ${this.starredSegments.length} Starred Segments`);

    return this.starredSegments
      .reduce((promiseChain, item) => {
        return promiseChain.then(() => {
          return this.strava.api.getStreamCoords(StravaStreamSource.segments, item.id, item.name).then((resp) => {
            item.coordinates = resp;
          });
        });
      }, Promise.resolve())
      .then((resp) => {
        return Promise.resolve();
      });
  }

  private saveXml() {
    const opts: BikelogOutputOpts = {
      more: this.options.more,
      dates: this.options.dateRanges,
      imperial: this.options.imperial,
      selectedBikes: this.options.config.bikes,
      bikes: this.strava.bikes,
      log: this.log,
    };
    if (this.options.segments === 'flat') {
      opts.segmentsFlatFolder = true;
    }
    const bikelog = new Bikelog(opts);
    return bikelog.outputData(this.options.xml, this.strava.activities);
  }

  private saveKml(options: { activities?: boolean; segments?: boolean } = {}) {
    const opts: KmlOpts = {
      more: this.options.more,
      dates: this.options.dateRanges,
      imperial: this.options.imperial,
      activities: options.activities,
      segments: options.segments,
      bikes: this.strava.bikes,
      log: this.log,
    };
    if (this.options.segments === 'flat') {
      opts.segmentsFlatFolder = true;
    }
    const kml = new Kml(opts);
    return kml.outputData(this.options.kml, this.strava.activities, this.starredSegments);
  }
}
