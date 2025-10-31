// Colors are aabbggrr

import type { LineStyleDefs } from './types.ts';

export const defaultLineStyles: LineStyleDefs = {
  Default: {
    color: 'C00000FF',
    width: 4,
  },
  Ride: {
    color: 'C00000A0',
    width: 4,
  },
  EBikeRide: {
    color: '7FFF00FF',
    width: 4,
  },
  Moto: {
    color: '6414F03C',
    width: 4,
  },
  Segment: {
    color: 'C0FFFFFF',
    width: 6,
  },
  Commute: {
    color: 'C085037D',
    width: 4,
  },
  Hike: {
    color: 'F0FF0000',
    width: 4,
  },
  Walk: {
    color: 'F0f08000',
    width: 4,
  },
  'Stand Up Paddling': {
    color: 'F0f08000',
    width: 4,
  },
  'Nordic Ski': {
    color: 'F0f08000',
    width: 4,
  },
} as const;
