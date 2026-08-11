import { describe, it, expect } from 'vitest';
import * as Path from 'path';
import { PathResolver } from '../src/PathResolver';

describe('PathResolver.resolveDottedPath', () => {
    it('resolves a plain dotted name to a nested file path', () => {
        const resolved = PathResolver.resolveDottedPath('samples.movie.Movie', '/project');
        expect(resolved).toBe(Path.join('/project', 'samples/movie/Movie.exon'));
    });

    it('resolves a scoped package identifier to a directory named after the scope', () => {
        const resolved = PathResolver.resolveDottedPath('+google.apis', '/project/modules');
        expect(resolved).toBe(Path.join('/project/modules', '+google/apis.exon'));
    });
});
