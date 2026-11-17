import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

describe('On-demand revalidate route', () => {
  beforeEach(() => {
    process.env.REVALIDATE_SECRET = 'test-revalidate-secret-123';
  });

  it('rejects revalidation when secret is missing or incorrect', async () => {
    const req = new NextRequest('http://localhost:3000/api/revalidate', {
      method: 'POST',
      headers: { 'x-revalidate-secret': 'wrong-secret' },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('revalidates paths when valid secret header is provided', async () => {
    const req = new NextRequest('http://localhost:3000/api/revalidate', {
      method: 'POST',
      headers: { 'x-revalidate-secret': 'test-revalidate-secret-123' },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.revalidated).toBe(true);
  });
});
