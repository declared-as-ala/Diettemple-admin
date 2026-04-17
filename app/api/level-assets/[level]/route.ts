import { promises as fs } from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

const CANDIDATE_DIRS = [
  path.join(process.cwd(), 'public', 'level'),
  path.resolve(process.cwd(), '../Mobile/assets/level'),
  path.resolve(process.cwd(), '..', 'Mobile', 'assets', 'level'),
  path.resolve(process.cwd(), '../Mobile/assets'),
];

const CANDIDATE_EXTENSIONS = ['.png', '.webp', '.jpg', '.jpeg', '.avif'];

function normalizeLevelName(raw: string): string {
  const value = raw.trim();
  if (!value) return 'Intiate';
  const lower = value.toLowerCase();
  if (lower === 'initiate' || lower === 'intiate') return 'Intiate';
  if (lower === 'fighter') return 'Fighter';
  if (lower === 'warrior') return 'Fighter';
  if (lower === 'champion') return 'Champion';
  if (lower === 'elite') return 'Elite';
  return value;
}

function contentTypeFromExt(ext: string): string {
  switch (ext) {
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.avif':
      return 'image/avif';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    default:
      return 'application/octet-stream';
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ level: string }> }
) {
  const { level } = await params;
  const normalized = normalizeLevelName(decodeURIComponent(level));

  for (const dir of CANDIDATE_DIRS) {
    for (const ext of CANDIDATE_EXTENSIONS) {
      const filePath = path.join(dir, `${normalized}${ext}`);
      try {
        const file = await fs.readFile(filePath);
        return new NextResponse(new Uint8Array(file), {
          headers: {
            'Content-Type': contentTypeFromExt(ext),
            'Cache-Control': 'public, max-age=86400',
          },
        });
      } catch {
        // Try next candidate path/extension.
      }
    }
  }

  return NextResponse.json({ message: 'Level image not found' }, { status: 404 });
}

