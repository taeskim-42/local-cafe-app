import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface RouteParams {
  params: {
    deviceLibraryId: string;
    passTypeId: string;
  };
}

/**
 * GET: 업데이트 가능한 Pass 목록 조회
 * Apple Wallet이 주기적으로 업데이트 확인할 때 호출
 *
 * Query params:
 * - passesUpdatedSince: ISO 8601 timestamp (optional)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { deviceLibraryId, passTypeId } = params;
  const { searchParams } = new URL(request.url);
  const passesUpdatedSince = searchParams.get('passesUpdatedSince');

  try {
    // 해당 디바이스에 등록된 Pass 조회
    let query = supabase
      .from('wallet_passes')
      .select('pass_serial_number, updated_at')
      .eq('apple_device_library_id', deviceLibraryId)
      .eq('platform', 'apple')
      .eq('status', 'active');

    // 마지막 업데이트 이후 변경된 Pass만 필터
    if (passesUpdatedSince) {
      query = query.gt('updated_at', passesUpdatedSince);
    }

    const { data: passes, error } = await query;

    if (error) {
      console.error('Error fetching passes:', error);
      return new NextResponse(null, { status: 500 });
    }

    if (!passes || passes.length === 0) {
      // 업데이트할 Pass가 없음
      return new NextResponse(null, { status: 204 });
    }

    // 응답 형식: { serialNumbers: [...], lastUpdated: "timestamp" }
    const serialNumbers = passes.map((p) => p.pass_serial_number);
    const lastUpdated = passes.reduce((latest, p) => {
      return p.updated_at > latest ? p.updated_at : latest;
    }, passes[0].updated_at);

    return NextResponse.json({
      serialNumbers,
      lastUpdated,
    });
  } catch (error) {
    console.error('Error in GET registrations:', error);
    return new NextResponse(null, { status: 500 });
  }
}
