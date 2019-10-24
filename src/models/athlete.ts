import { MainOpts } from '../main';
export class Athelete {
  bikes: any;

  constructor(data) {
    Object.assign(this, data);
  }

  static newFromResponseData(data): Athelete {
    return new Athelete(data);
  }
}
