import { isString, isNumber } from 'epdoc-util';

export type LineStyle = {
  color: string;
  width: number;
};

export type KmlOpts = {
  verbose?: number;
};

const REGEX = {
  color: /^[a-zA-Z0-9]{8}$/
};

export class Kml {
  lineStyles: Record<string, LineStyle>;
  verbose: number;

  constructor(opts: KmlOpts = {}) {
    this.verbose = opts.verbose;
  }

  setLineStyles(styles: Record<string, LineStyle>) {
    Object.keys(styles).forEach(name => {
      const style = styles[name];
      if (style && isString(style.color) && isNumber(style.width) && REGEX.color.test(style.color)) {
        this.lineStyles[name] = style;
      } else {
        console.log(
          'Warning: ignoring line style error for %s. Style must be in form \'{ "color": "C03030C0", "width": 2 }\'',
          name
        );
      }
    });
  }
}
