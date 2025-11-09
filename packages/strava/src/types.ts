import type { Api } from './dep.ts';
import type * as Kml from './kml/mod.ts';

/**
 * Bike definition for mapping Strava bike names to custom display names.
 *
 * Used in user settings to specify shorter or clearer names for bikes
 * in PDF/XML output.
 */
export type BikeDef = {
  /** Display name to use in output */
  name: string;
  /** Pattern to match against Strava bike name (case-insensitive) */
  pattern: string;
};
