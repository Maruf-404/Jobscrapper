import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    const expected = process.env.REVIEW_PASSWORD || 'fresher2026';

    if (!password || password.trim() !== expected.trim()) {
      return NextResponse.json({ error: 'Invalid review password' }, { status: 401 });
    }

    const res = NextResponse.json({ success: true });
    // Set a session cookie for easy client-side persistence
    res.cookies.set('review_auth', 'true', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return res;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
