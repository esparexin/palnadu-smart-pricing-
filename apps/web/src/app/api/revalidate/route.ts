import { revalidatePath, revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const secret =
    request.headers.get('x-revalidate-secret') || request.nextUrl.searchParams.get('secret');
  const configuredSecret = process.env.REVALIDATE_SECRET;

  if (!configuredSecret || secret !== configuredSecret) {
    return NextResponse.json({ error: 'Unauthorized revalidation request' }, { status: 401 });
  }

  let body: { path?: string; tag?: string } = {};
  try {
    body = (await request.json()) as { path?: string; tag?: string };
  } catch {
    // Optional body
  }

  if (body.tag) {
    revalidateTag(body.tag);
  }

  if (body.path) {
    revalidatePath(body.path);
  } else {
    revalidatePath('/', 'layout');
    revalidatePath('/products/[slug]', 'page');
    revalidatePath('/categories', 'page');
  }

  return NextResponse.json({
    revalidated: true,
    timestamp: Date.now(),
  });
}
