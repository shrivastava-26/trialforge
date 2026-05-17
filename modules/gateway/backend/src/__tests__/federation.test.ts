/**
 * Federation smoke test — validates that subgraph schemas compile
 * and contain expected federation metadata (_service SDL).
 */
import { describe, it, expect } from 'vitest';
import { graphql } from 'graphql';

describe('Federation subgraph schemas', () => {
  it('site-network subgraph schema builds and exposes _service SDL', async () => {
    // Dynamic import to avoid requiring DB at module load in CI
    const { schema } = await import(
      '../../../site-network/backend/src/federation/schema'
    ) as { schema: import('graphql').GraphQLSchema };

    const result = await graphql({
      schema,
      source: '{ _service { sdl } }',
    });

    expect(result.errors).toBeUndefined();
    expect(result.data?._service).toBeDefined();
    const sdl = (result.data!._service as { sdl: string }).sdl;
    expect(sdl).toContain('@key');
    expect(sdl).toContain('type User');
    expect(sdl).toContain('type Site');
    expect(sdl).toContain('type Study');
  });

  it('reporting subgraph schema builds and exposes _service SDL', async () => {
    const { schema } = await import(
      '../../../reporting/backend/src/federation/schema'
    ) as { schema: import('graphql').GraphQLSchema };

    const result = await graphql({
      schema,
      source: '{ _service { sdl } }',
    });

    expect(result.errors).toBeUndefined();
    expect(result.data?._service).toBeDefined();
    const sdl = (result.data!._service as { sdl: string }).sdl;
    expect(sdl).toContain('type DashboardMetrics');
    expect(sdl).toContain('type User');
    expect(sdl).toContain('@external');
  });
});
