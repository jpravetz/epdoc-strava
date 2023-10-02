import { Dict, isNumber, isString } from 'epdoc-util';
import { Metres } from './../util';

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

  constructor(data: Dict) {
    Object.assign(this, data);
  }

  static newFromResponseData(data): Athlete {
    return new Athlete(data);
  }

  static isInstance(val: any): val is Athlete {
    return val && isNumber(val.id) && isString(val.username);
  }
}
