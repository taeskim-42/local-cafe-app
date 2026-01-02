import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateApplePass } from '@/lib/wallet/apple/passGenerator';

/**
 * 테스트용 Pass 생성 API (개발 환경에서만 사용)
 * GET /api/wallet/apple/test
 */
export async function GET(request: NextRequest) {
  // 테스트 데이터 조회
  const { data: cafe } = await supabase
    .from('cafes')
    .select('*')
    .limit(1)
    .single();

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .limit(1)
    .single();

  if (!cafe || !user) {
    return NextResponse.json(
      { error: 'Test data not found' },
      { status: 404 }
    );
  }

  // 테스트용 스탬프 데이터
  const stamp = {
    id: 'test-stamp-id',
    user_id: user.id,
    cafe_id: cafe.id,
    count: 3,
    total_earned: 5,
    total_used: 2,
  };

  try {
    console.log('Generating pass for:', { user: user.name, cafe: cafe.name, stamp });

    const result = await generateApplePass({
      user,
      cafe,
      stamp,
    });

    console.log('Pass generation result:', { hasBuffer: !!result.passBuffer, serialNumber: result.serialNumber });

    if (!result.passBuffer) {
      return NextResponse.json(
        { error: 'Pass buffer is empty' },
        { status: 500 }
      );
    }

    // .pkpass 파일로 응답
    return new NextResponse(result.passBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.pkpass',
        'Content-Disposition': 'attachment; filename="test-stamp-card.pkpass"',
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Test pass generation error:', errorMessage);
    console.error('Stack:', errorStack);
    return NextResponse.json(
      { error: errorMessage, stack: errorStack },
      { status: 500 }
    );
  }
}
