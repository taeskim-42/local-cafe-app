import { NextRequest, NextResponse } from 'next/server';

/**
 * POST: 에러 로깅
 * Apple Wallet이 에러 발생 시 호출
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 에러 로그 기록 (개발/디버깅용)
    console.log('[Apple Wallet Log]', JSON.stringify(body, null, 2));

    // 필요하다면 DB에 저장하거나 외부 로깅 서비스로 전송
    // await supabase.from('apple_wallet_logs').insert({
    //   logs: body.logs,
    //   created_at: new Date().toISOString(),
    // });

    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error('Error logging:', error);
    return new NextResponse(null, { status: 200 }); // 로깅 실패해도 200 반환
  }
}
