import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { validateAuthToken } from '@/lib/wallet/apple/passGenerator';

interface RouteParams {
  params: {
    deviceLibraryId: string;
    passTypeId: string;
    serialNumber: string;
  };
}

/**
 * POST: 디바이스 등록
 * Apple Wallet이 Pass를 추가할 때 호출
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { deviceLibraryId, passTypeId, serialNumber } = params;

  // Authorization 헤더에서 토큰 추출
  const authHeader = request.headers.get('authorization');
  const authToken = authHeader?.replace('ApplePass ', '');

  // 인증 토큰 검증
  if (!validateAuthToken(authToken, serialNumber)) {
    return new NextResponse(null, { status: 401 });
  }

  try {
    // 요청 본문에서 pushToken 추출
    const body = await request.json();
    const pushToken = body.pushToken;

    if (!pushToken) {
      return new NextResponse(null, { status: 400 });
    }

    // wallet_passes 테이블에서 해당 Pass 찾기
    const { data: pass, error: findError } = await supabase
      .from('wallet_passes')
      .select('id')
      .eq('pass_serial_number', serialNumber)
      .eq('platform', 'apple')
      .single();

    if (findError || !pass) {
      console.error('Pass not found:', serialNumber);
      return new NextResponse(null, { status: 404 });
    }

    // 디바이스 등록 정보 업데이트
    const { error: updateError } = await supabase
      .from('wallet_passes')
      .update({
        apple_device_library_id: deviceLibraryId,
        apple_push_token: pushToken,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pass.id);

    if (updateError) {
      console.error('Device registration failed:', updateError);
      return new NextResponse(null, { status: 500 });
    }

    // 등록 로그
    await supabase.from('pass_update_logs').insert({
      wallet_pass_id: pass.id,
      event_type: 'registered',
      details: {
        deviceLibraryId,
        passTypeId,
      },
    });

    // 새로 등록된 경우 201, 이미 있으면 200
    return new NextResponse(null, { status: 201 });
  } catch (error) {
    console.error('Device registration error:', error);
    return new NextResponse(null, { status: 500 });
  }
}

/**
 * DELETE: 디바이스 등록 해제
 * Apple Wallet에서 Pass를 삭제할 때 호출
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { deviceLibraryId, passTypeId, serialNumber } = params;

  // Authorization 헤더에서 토큰 추출
  const authHeader = request.headers.get('authorization');
  const authToken = authHeader?.replace('ApplePass ', '');

  // 인증 토큰 검증
  if (!validateAuthToken(authToken, serialNumber)) {
    return new NextResponse(null, { status: 401 });
  }

  try {
    // wallet_passes 테이블에서 해당 Pass 찾기
    const { data: pass, error: findError } = await supabase
      .from('wallet_passes')
      .select('id')
      .eq('pass_serial_number', serialNumber)
      .eq('platform', 'apple')
      .single();

    if (findError || !pass) {
      return new NextResponse(null, { status: 404 });
    }

    // 디바이스 등록 정보 제거
    const { error: updateError } = await supabase
      .from('wallet_passes')
      .update({
        apple_device_library_id: null,
        apple_push_token: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pass.id);

    if (updateError) {
      console.error('Device unregistration failed:', updateError);
      return new NextResponse(null, { status: 500 });
    }

    // 삭제 로그
    await supabase.from('pass_update_logs').insert({
      wallet_pass_id: pass.id,
      event_type: 'deleted',
      details: {
        deviceLibraryId,
        passTypeId,
      },
    });

    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error('Device unregistration error:', error);
    return new NextResponse(null, { status: 500 });
  }
}
