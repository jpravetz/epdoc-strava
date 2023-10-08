import { isArray } from 'epdoc-util';
import { SummarySegment } from 'strava';
import { TokenExchangeResponse } from './server';
import {
  EpochSeconds,
  Seconds,
  StravaAccessToken,
  StravaClientId,
  StravaClientSecret,
  StravaRefreshToken,
} from './types';

export class BasicStravaConfig {
  constructor() {}

  async init(): Promise<void> {
    return Promise.resolve();
  }

  public async updateCredentials(res: TokenExchangeResponse): Promise<void> {
    return Promise.resolve();
  }

  public credentialsAreValid(expiresIn: Seconds = 5 * 60): boolean {
    const tLimit: EpochSeconds = Date.now() / 1000 + expiresIn;
    return this.tokenType === 'Bearer' && this.expiresAt > tLimit;
  }

  get clientId(): StravaClientId {
    return null;
  }
  get clientSecret(): StravaClientSecret {
    return null;
  }
  get accessToken(): StravaAccessToken {
    return null;
  }
  get refreshToken(): StravaRefreshToken {
    return null;
  }
  get expiresAt(): EpochSeconds {
    return null;
  }
  get tokenType(): string {
    return null;
  }

  public async getSummarySegmentCache(): Promise<SummarySegment[]> {
    return Promise.resolve([]);
  }

  public static getSummarySegmentByName(cache: SummarySegment[], name: string): SummarySegment {
    if (isArray(cache)) {
      return cache.find((seg) => {
        seg.name === name;
      });
    }
  }

  public async updateSummarySegmentCache(summarySegments: SummarySegment[]): Promise<SummarySegment[]> {
    return Promise.resolve([]);
  }

  get summarySegmentsAreCached(): boolean {
    return false;
  }
}
