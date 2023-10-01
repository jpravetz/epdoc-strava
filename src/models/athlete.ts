import { Dict, isNumber, isString } from 'epdoc-util';
import { Metres } from './../util';

export type StravaBike = {
  id?: string;
  primary?: boolean;
  name?: string;
  distance?: Metres;
};

export class Athelete {
  bikes: StravaBike[];
  id: number;
  username: string;

  constructor(data: Dict) {
    Object.assign(this, data);
  }

  static newFromResponseData(data): Athelete {
    return new Athelete(data);
  }

  static isInstance(val: any): val is Athelete {
    return val && isNumber(val.id) && isString(val.username);
  }
}
