import type * as FS from '@epdoc/fs/fs';
import { _ } from '@epdoc/type';
import { Api } from '../dep.ts';
import type * as Stream from './types.ts';

export class TrackWriter {
  protected opts: Stream.Opts = {};
  protected buffer: string = '';
  protected writer?: FS.Writer;

  /**
   * @param [opts={}] - Stream generation options.
   */
  constructor(opts: Stream.Opts = {}) {
    this.opts = opts;
  }

  /**
   * Overwrites the current Stream generation options.
   * @param [opts={}] - Stream generation options.
   */
  setOptions(opts: Stream.Opts = {}) {
    this.opts = opts;
  }

  /**
   * Lists the stream types we will need to retrieve from Strava for the output stream we are generating.
   * @returns
   */
  streamTypes(): Api.Schema.StreamType[] {
    return [Api.Schema.StreamKeys.LatLng];
  }

  /**
   * Writes a string to the internal buffer with specified indentation.
   *
   * @private
   * @param indent - The indentation level (number of spaces) or a string.
   * @param s - The string to write.
   */
  protected write(indent: string | number, s: string): void {
    if (_.isString(indent)) {
      this.buffer += s;
    } else {
      const indent2 = new Array(indent + 1).join('  ');
      this.buffer += indent2 + s;
    }
  }

  /**
   * Writes a string to the internal buffer with specified indentation, followed by a newline.
   *
   * @private
   * @param indent - The indentation level (number of spaces) or a string.
   * @param s - The string to write.
   */
  protected writeln(indent: string | number, s: string): void {
    if (_.isString(indent)) {
      this.buffer += s + '\n';
    } else {
      const indent2 = new Array(indent + 1).join('  ');
      this.buffer += indent2 + s + '\n';
    }
    // this.buffer.write( indent + s + "\n", 'utf8' );
  }

  protected writelns(indent: string | number, lines: string[]): void {
    for (const line of lines) {
      this.writeln(indent, line);
    }
  }

  /**
   * Flushes the internal buffer to the file writer.
   *
   * This public method delegates to the private _flush() implementation.
   * Called after generating header, activities, segments, and footer to ensure
   * all buffered content is written to the output file.
   */
  async flush(): Promise<void> {
    await this.#flush();
  }

  /**
   * Internal implementation for flushing buffered content to the file writer.
   *
   * Writes the current buffer contents to the FileSpecWriter and clears the buffer.
   * Uses buffering for better write performance when generating large KML files.
   */
  async #flush(): Promise<void> {
    if (this.writer && this.buffer) {
      const content = this.buffer;
      this.buffer = '';
      await this.writer.write(content);
    }
  }
}
