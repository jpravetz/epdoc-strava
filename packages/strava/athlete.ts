import type { Metres } from "../../src/types.ts";

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

  constructor(data) {
    Object.assign(this, data);
  }

  static newFromResponseData(data): Athelete {
    return new Athelete(data);
  }
}
