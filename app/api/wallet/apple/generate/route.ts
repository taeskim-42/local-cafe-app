import { NextRequest, NextResponse } from 'next/server';
import { generateApplePass } from '@/lib/wallet/apple/passGenerator';
import { getCafe, getCafeStamp } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';

/**
 * GET /api/wallet/apple/generate?cafeId=xxx
 * Apple Wallet Pass 생성 및 다운로드
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cafeId = searchParams.get('cafeId');

    if (!cafeId) {
      return NextResponse.json(
        { error: 'cafeId is required' },
        { status: 400 }
      );
    }

    // 현재 사용자 확인
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Login required' },
        { status: 401 }
      );
    }

    // 카페 정보 조회
    const cafe = await getCafe(cafeId);
    if (!cafe) {
      return NextResponse.json(
        { error: 'Cafe not found' },
        { status: 404 }
      );
    }

    // 스탬프 조회 (없으면 기본값)
    let stamp = await getCafeStamp(user.id, cafeId);
    if (!stamp) {
      stamp = {
        id: '',
        user_id: user.id,
        cafe_id: cafeId,
        count: 0,
        total_earned: 0,
        total_used: 0,
      };
    }

    // Pass 생성
    const result = await generateApplePass({
      user,
      cafe,
      stamp,
    });

    if (!result.passBuffer) {
      return NextResponse.json(
        { error: 'Failed to generate pass' },
        { status: 500 }
      );
    }

    // .pkpass 파일로 응답
    return new NextResponse(result.passBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.pkpass',
        'Content-Disposition': `attachment; filename="${cafe.name}-stamp.pkpass"`,
      },
    });
  } catch (error) {
    console.error('Pass generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
