import { describe, it } from '@std/testing/bdd';
import { expect } from '@std/expect';
import { SegmentBase } from '../src/segment/base.ts';

describe('SegmentBase', () => {
  describe('constructor', () => {
    it('should create an instance with default values', () => {
      const segment = new SegmentBase();

      expect(segment.id).toBe(0);
      expect(segment.name).toBe('');
      expect(segment.distance).toBe(0);
      expect(segment.elapsed_time).toBe(0);
      expect(segment.moving_time).toBe(0);
    });

    it('should create an instance with provided values', () => {
      const segment = new SegmentBase({
        id: 123,
        name: 'Test Segment',
        distance: 1500,
        elapsed_time: 300,
        moving_time: 280,
      });

      expect(segment.id).toBe(123);
      expect(segment.name).toBe('Test Segment');
      expect(segment.distance).toBe(1500);
      expect(segment.elapsed_time).toBe(300);
      expect(segment.moving_time).toBe(280);
    });

    it('should handle partial data assignment', () => {
      const segment = new SegmentBase({
        id: 456,
        name: 'Partial Segment',
      });

      expect(segment.id).toBe(456);
      expect(segment.name).toBe('Partial Segment');
      expect(segment.distance).toBe(0); // Default value
      expect(segment.elapsed_time).toBe(0); // Default value
    });
  });
});
