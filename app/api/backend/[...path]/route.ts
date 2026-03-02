import { NextRequest, NextResponse } from 'next/server';

// Default HTTPS backend; can be overridden via BACKEND_API_URL
const BACKEND = (process.env.BACKEND_API_URL || 'https://next.protein.tn/api').replace(/\/$/, '');

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(request, await params);
}
export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(request, await params);
}
export async function PUT(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(request, await params);
}
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(request, await params);
}
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(request, await params);
}

async function proxy(request: NextRequest, { path }: { path: string[] }) {
  const pathStr = path?.length ? path.join('/') : '';
  const url = new URL(request.url);
  const search = url.searchParams.toString();
  const target = `${BACKEND}/${pathStr}${search ? `?${search}` : ''}`;

  const headers: HeadersInit = {};
  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === 'host' || lower === 'connection') return;
    headers[key] = value;
  });

  let body: string | undefined;
  try {
    body = await request.text();
  } catch {
    // no body
  }

  const res = await fetch(target, {
    method: request.method,
    headers,
    body: body || undefined,
  });

  const resBody = await res.text();
  return new NextResponse(resBody, {
    status: res.status,
    statusText: res.statusText,
    headers: {
      'Content-Type': res.headers.get('Content-Type') || 'application/json',
    },
  });
}
