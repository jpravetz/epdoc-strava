import { isDict, isFunction, isInteger, isNonEmptyString, isPosInteger } from 'epdoc-util';

export type FilePath = string;
export type FolderPath = string;
export type FileName = string;
export type FileExt = string; // includes '.'
export type EpochMilliseconds = number;
export type EpochSeconds = number;
export type Seconds = number;
export type Metres = number;
export type Kilometres = number;
export type IsoDateString = string;

export type StravaClientId = number;
export type StravaClientSecret = string;
export type StravaAccessToken = string;
export type StravaRefreshToken = string;
export type StravaCode = string;

export type StravaCoord = [number, number];
export type StravaCoordData = {
  type: string;
  data: StravaCoord[];
};
export type StravaClientConfig = {
  id: StravaClientId;
  secret: StravaClientSecret;
};
export function isStravaClientConfig(val: any): val is StravaClientConfig {
  return isDict(val) && isPosInteger(val.id) && isNonEmptyString(val.secret);
}

export function isFilePath(val: any): val is FilePath {
  return isNonEmptyString(val);
}

export function isFolderPath(val: any): val is FolderPath {
  return isNonEmptyString(val);
}

export function isFileName(val: any): val is FileName {
  return isNonEmptyString(val);
}

export function isEpochSeconds(val: any): val is EpochSeconds {
  return isInteger(val) && val >= 0;
}

export type LogFunction = (msg: string) => void;
export function isLogFunction(val: any): val is LogFunction {
  return isFunction(val);
}
export type LogFunctions = {
  info: LogFunction;
  warn: LogFunction;
  debug: LogFunction;
  error: LogFunction;
  verbose: LogFunction;
};
export function isLogFunctions(val: any): val is LogFunction {
  return (
    isDict(val) &&
    isLogFunction(val.info) &&
    isLogFunction(val.warn) &&
    isLogFunction(val.error) &&
    isLogFunction(val.debug) &&
    isLogFunction(val.verbose)
  );
}
export type LogOpts = {
  log: LogFunctions;
};
export type RefreshOpts = {
  refresh?: boolean;
};

export type DateRange = {
  before: EpochSeconds;
  after: EpochSeconds;
};

export type anyXXX = any;
