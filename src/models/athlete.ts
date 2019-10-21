import { MainOpts } from '../main';
export class Athelete {
  constructor(data) {
    Object.assign(this, data);
  }

  static newFromResponseData(data): Athelete {
    return new Athelete(data);
  }
}
