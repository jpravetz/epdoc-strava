import { describe, it } from '@std/testing/bdd';
import { expect } from '@std/expect';
import { SegmentFile } from '../../src/segment/file.ts';
import type * as Ctx from '../../src/context.ts';
import type { FileSpec } from '@epdoc/fs';
import type { Strava } from '../../src/segment/dep.ts';
import type * as Segment from '../../src/segment/types.ts';

// Mock Ctx.Context
const mockContext: Ctx.Context = {
  log: {
    info: {
      h2: () => mockContext.log.info,
      emit: () => {},
      count: () => mockContext.log.info,
      label: () => mockContext.log.info,
      ewt: () => mockContext.log.info,
    },
    error: {
      h2: () => mockContext.log.error,
      err: () => mockContext.log.error,
      path: () => mockContext.log.error,
      ewt: () => mockContext.log.error,
    },
    mark: () => 0, // Return a dummy number for mark
  } as unknown as Ctx.Context['log'], // Cast to satisfy type
};

// Mock FileSpec
class MockFileSpec implements FileSpec {
  path: string = '/mock/path/segments.json';
  content: Record<string, unknown> | null = null;
  exists: boolean = false;

  async isFile(): Promise<boolean> {
    return this.exists;
  }

  async readJson<T>(): Promise<T> {
    if (!this.exists || !this.content) {
      throw new Error('File not found or empty');
    }
    return this.content as T;
  }

  async writeJson(data: Record<string, unknown>): Promise<void> {
    this.content = data;
    this.exists = true;
  }
}

// Mock StravaApi
class MockStravaApi implements Strava.Api {
  segments: Strava.Schema.SegmentSummary[] = [];

  async getStarredSegments(
    _summarySegments: Strava.Schema.SegmentSummary[],
  ): Promise<Strava.Schema.SegmentSummary[]> {
    return Promise.resolve(this.segments);
  }
}

describe('SegmentFile', () => {
  let mockFsFile: MockFileSpec;
  let mockStravaApi: MockStravaApi;
  let segmentFile: SegmentFile;

  beforeEach(() => {
    mockFsFile = new MockFileSpec();
    mockStravaApi = new MockStravaApi();
    segmentFile = new SegmentFile(mockFsFile, mockStravaApi);
  });

  describe('read', () => {
    it('should read segments from an existing file', async () => {
      const mockSegments: Record<Segment.Name, Segment.CacheEntry> = {
        'Segment 1': { id: 1, name: 'Segment 1', distance: 1000, elevation: 50 },
        'Segment 2': { id: 2, name: 'Segment 2', distance: 2000, elevation: 100 },
      };
      mockFsFile.exists = true;
      mockFsFile.content = { segments: mockSegments };

      await segmentFile.read(mockContext);
      expect(segmentFile.getSegment('Segment 1')).toEqual(mockSegments['Segment 1']);
      expect(segmentFile.getSegment('Segment 2')).toEqual(mockSegments['Segment 2']);
    });

    it('should handle file not found', async () => {
      mockFsFile.exists = false;
      await segmentFile.read(mockContext);
      expect(segmentFile.getSegment('Any Segment')).toBeUndefined();
    });

    it('should handle empty segments in file', async () => {
      mockFsFile.exists = true;
      mockFsFile.content = { segments: {} };
      await segmentFile.read(mockContext);
      expect(segmentFile.getSegment('Any Segment')).toBeUndefined();
    });
  });

  describe('write', () => {
    it('should write segments to a file', async () => {
      const mockSegments: Record<Segment.Name, Segment.CacheEntry> = {
        'Segment A': { id: 3, name: 'Segment A', distance: 3000, elevation: 150 },
      };
      // Manually set segments in the SegmentFile instance for testing write
      // This requires a way to set #segments, which is private.
      // For testing private members, we can either:
      // 1. Use a type assertion to access it (less ideal for production code, but common in tests)
      // 2. Add a public method to set segments (if it makes sense for the class design)
      // 3. Test indirectly via getFromServer and then write.
      // Let's use a type assertion for now for simplicity in testing.
      (segmentFile as any).#segments.set('Segment A', mockSegments['Segment A']);

      await segmentFile.write(mockContext);
      expect(mockFsFile.content).toBeDefined();
      expect((mockFsFile.content as any).segments['Segment A']).toEqual(mockSegments['Segment A']);
    });
  });

  describe('get', () => {
    it('should refresh segments from server when opts.refresh is true', async () => {
      const apiSegments: Strava.Schema.SegmentSummary[] = [
        {
          id: 10,
          name: 'API Segment 1',
          distance: 500,
          elevation: 20,
          asCacheEntry: () => ({ id: 10, name: 'API Segment 1', distance: 500, elevation: 20 }),
        },
      ];
      mockStravaApi.segments = apiSegments;

      await segmentFile.get(mockContext, { refresh: true });

      expect(segmentFile.getSegment('API Segment 1')).toEqual(apiSegments[0].asCacheEntry());
      expect(mockFsFile.content).toBeDefined(); // Should have written to file
    });

    it('should read from file if opts.refresh is false and file exists', async () => {
      const fileSegments: Record<Segment.Name, Segment.CacheEntry> = {
        'File Segment 1': { id: 11, name: 'File Segment 1', distance: 600, elevation: 30 },
      };
      mockFsFile.exists = true;
      mockFsFile.content = { segments: fileSegments };

      await segmentFile.get(mockContext, { refresh: false });

      expect(segmentFile.getSegment('File Segment 1')).toEqual(fileSegments['File Segment 1']);
      expect(mockStravaApi.segments.length).toBe(0); // Should not have called API
    });

    it('should fetch from server and write if opts.refresh is false and file read fails', async () => {
      mockFsFile.exists = false; // Simulate file read failure
      const apiSegments: Strava.Schema.SegmentSummary[] = [
        {
          id: 12,
          name: 'API Segment 2',
          distance: 700,
          elevation: 40,
          asCacheEntry: () => ({ id: 12, name: 'API Segment 2', distance: 700, elevation: 40 }),
        },
      ];
      mockStravaApi.segments = apiSegments;

      await segmentFile.get(mockContext, { refresh: false });

      expect(segmentFile.getSegment('API Segment 2')).toEqual(apiSegments[0].asCacheEntry());
      expect(mockFsFile.content).toBeDefined(); // Should have written to file
    });
  });

  describe('#getFromServer', () => {
    it('should fetch segments from Strava API', async () => {
      const apiSegments: Strava.Schema.SegmentSummary[] = [
        {
          id: 20,
          name: 'API Segment X',
          distance: 800,
          elevation: 50,
          asCacheEntry: () => ({ id: 20, name: 'API Segment X', distance: 800, elevation: 50 }),
        },
      ];
      mockStravaApi.segments = apiSegments;

      // Access private method for testing purposes
      await (segmentFile as any).#getFromServer(mockContext);

      expect(segmentFile.getSegment('API Segment X')).toEqual(apiSegments[0].asCacheEntry());
    });

    it('should overwrite existing segments with new data from API', async () => {
      const initialSegment: Segment.CacheEntry = {
        id: 21,
        name: 'Overwrite Me',
        distance: 100,
        elevation: 10,
      };
      (segmentFile as any).#segments.set('Overwrite Me', initialSegment);

      const apiSegments: Strava.Schema.SegmentSummary[] = [
        {
          id: 21,
          name: 'Overwrite Me',
          distance: 900,
          elevation: 60,
          asCacheEntry: () => ({ id: 21, name: 'Overwrite Me', distance: 900, elevation: 60 }),
        },
      ];
      mockStravaApi.segments = apiSegments;

      await (segmentFile as any).#getFromServer(mockContext);

      expect(segmentFile.getSegment('Overwrite Me')).toEqual(apiSegments[0].asCacheEntry());
    });
  });

  describe('getSegment', () => {
    it('should return an existing segment', () => {
      const mockSegment: Segment.CacheEntry = { id: 30, name: 'Test Segment', distance: 1500, elevation: 75 };
      (segmentFile as any).#segments.set('Test Segment', mockSegment);
      expect(segmentFile.getSegment('Test Segment')).toEqual(mockSegment);
    });

    it('should return undefined for a non-existing segment', () => {
      expect(segmentFile.getSegment('Non Existent')).toBeUndefined();
    });
  });
});
