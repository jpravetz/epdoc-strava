import { describe, it } from '@std/testing/bdd';
import { expect } from '@std/expect';
import { asCacheEntry } from '../src/segment/utils.ts';
import type { SummarySegment } from '../../strava-api/src/schema/segment.ts';

describe('segment utils', () => {
  describe('asCacheEntry', () => {
    it('should convert valid SummarySegment to CacheEntry', () => {
      const summarySegment: SummarySegment = {
        id: 12345,
        name: 'Test Segment',
        distance: 1500,
        average_grade: 5.2,
        elevation_high: 200,
        elevation_low: 150,
        country: 'USA',
        state: 'California',
        // Required fields for SummarySegment
        activity_type: 'Ride',
        maximum_grade: 8.0,
        start_latlng: [37.7749, -122.4194],
        end_latlng: [37.7750, -122.4195],
        climb_category: 0,
        city: 'San Francisco',
        private: false,
      };

      const cacheEntry = asCacheEntry(summarySegment);

      expect(cacheEntry).toBeDefined();
      if (cacheEntry) {
        expect(cacheEntry.id).toBe(12345);
        expect(cacheEntry.name).toBe('Test Segment');
        expect(cacheEntry.distance).toBe(1500);
        expect(cacheEntry.gradient).toBe(5.2);
        expect(cacheEntry.elevation).toBe(50); // elevation_high - elevation_low
        expect(cacheEntry.country).toBe('USA');
        expect(cacheEntry.state).toBe('California');
      }
    });

    it('should trim segment name', () => {
      const summarySegment: SummarySegment = {
        id: 67890,
        name: '  Padded Segment Name  ',
        distance: 1000,
        average_grade: 3.5,
        elevation_high: 100,
        elevation_low: 80,
        country: 'USA',
        state: 'Oregon',
        activity_type: 'Ride',
        maximum_grade: 6.0,
        start_latlng: [45.5231, -122.6765],
        end_latlng: [45.5232, -122.6766],
        climb_category: 0,
        city: 'Portland',
        private: false,
      };

      const cacheEntry = asCacheEntry(summarySegment);

      expect(cacheEntry).toBeDefined();
      if (cacheEntry) {
        expect(cacheEntry.name).toBe('Padded Segment Name');
      }
    });

    it('should return undefined for invalid data with missing required fields', () => {
      const invalidSegment = {
        id: 12345,
        // Missing name
        distance: 1500,
        average_grade: 5.2,
        elevation_high: 200,
        elevation_low: 150,
      } as unknown as SummarySegment;

      const cacheEntry = asCacheEntry(invalidSegment);

      expect(cacheEntry).toBeUndefined();
    });

    it('should calculate elevation correctly', () => {
      const summarySegment: SummarySegment = {
        id: 11111,
        name: 'Steep Hill',
        distance: 500,
        average_grade: 10.0,
        elevation_high: 350,
        elevation_low: 250,
        country: 'USA',
        state: 'Colorado',
        activity_type: 'Ride',
        maximum_grade: 15.0,
        start_latlng: [39.7392, -104.9903],
        end_latlng: [39.7393, -104.9904],
        climb_category: 2,
        city: 'Denver',
        private: false,
      };

      const cacheEntry = asCacheEntry(summarySegment);

      expect(cacheEntry).toBeDefined();
      if (cacheEntry) {
        expect(cacheEntry.elevation).toBe(100);
      }
    });
  });
});
