import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { validateAuthToken, updateApplePass } from '@/lib/wallet/apple/passGenerator';
import { getCafe, getCafeStamp } from '@/lib/api';

interface RouteParams {
  params: {
    passTypeId: string;
    serialNumber: string;
  };
}

/**
 * GET: 최신 Pass 다운로드
 * Push 알림 후 Apple Wallet이 업데이트된 Pass를 가져올 때 호출
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { passTypeId, serialNumber } = params;

  // Authorization 헤더에서 토큰 추출
  const authHeader = request.headers.get('authorization');
  const authToken = authHeader?.replace('ApplePass ', '');

  // 인증 토큰 검증
  if (!validateAuthToken(authToken, serialNumber)) {
    return new NextResponse(null, { status: 401 });
  }

  try {
    // wallet_passes에서 해당 Pass 정보 조회
    const { data: walletPass, error: passError } = await supabase
      .from('wallet_passes')
      .select('user_id, cafe_id')
      .eq('pass_serial_number', serialNumber)
      .eq('platform', 'apple')
      .eq('status', 'active')
      .single();

    if (passError || !walletPass) {
      return new NextResponse(null, { status: 404 });
    }

    // 사용자 정보 조회
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', walletPass.user_id)
      .single();

    if (userError || !user) {
      return new NextResponse(null, { status: 404 });
    }

    // 카페 정보 조회
    const cafe = await getCafe(walletPass.cafe_id);
    if (!cafe) {
      return new NextResponse(null, { status: 404 });
    }

    // 스탬프 조회
    let stamp = await getCafeStamp(walletPass.user_id, walletPass.cafe_id);
    if (!stamp) {
      stamp = {
        id: '',
        user_id: walletPass.user_id,
        cafe_id: walletPass.cafe_id,
        count: 0,
        total_earned: 0,
        total_used: 0,
      };
    }

    // 업데이트된 Pass 생성
    const passBuffer = await updateApplePass({
      user,
      cafe,
      stamp,
    });

    // updated_at 갱신
    await supabase
      .from('wallet_passes')
      .update({ updated_at: new Date().toISOString() })
      .eq('pass_serial_number', serialNumber)
      .eq('platform', 'apple');

    // .pkpass 파일로 응답
    return new NextResponse(passBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.pkpass',
        'Last-Modified': new Date().toUTCString(),
      },
    });
  } catch (error) {
    console.error('Pass download error:', error);
    return new NextResponse(null, { status: 500 });
  }
}
