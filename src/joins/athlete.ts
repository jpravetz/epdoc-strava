import { Dict, isNumber, isString } from 'epdoc-util';
import { Metres } from './../types';

export type StravaBike = {
  id?: string;
  primary?: boolean;
  name?: string;
  distance?: Metres;
};

export class Athlete {
  bikes: StravaBike[];
  id: number;
  username: string;
  firstname: string;
  lastname: string;
  profile_medium: string;
  profile: string;
  city: string;
  state: string;
  country: string;
  sex: 'M' | 'F';
  summit: boolean;
  created_at: Date;
  updated_at: Date;
  follower_count: number;
  friend_count: number;

  constructor(data: Dict) {
    Object.assign(this, data);
  }

  static newFromResponseData(data): Athlete {
    return new Athlete(data);
  }

  static isResponseData(val: any): val is Athlete {
    return val && isNumber(val.id) && isString(val.username);
  }
}
