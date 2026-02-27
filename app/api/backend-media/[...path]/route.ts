import { NextRequest, NextResponse } from 'next/server';

const BACKEND_ORIGIN = process.env.BACKEND_API_URL
  ? process.env.BACKEND_API_URL.replace(/\/api\/?$/, '')
  : 'http://145.223.118.9:5000';

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const pathStr = path?.length ? path.join('/') : '';
  const target = `${BACKEND_ORIGIN}/${pathStr}`;
  const res = await fetch(target, { method: 'GET' });
  const body = await res.arrayBuffer();
  return new NextResponse(body, {
    status: res.status,
    headers: {
      'Content-Type': res.headers.get('Content-Type') || 'application/octet-stream',
    },
  });
}
