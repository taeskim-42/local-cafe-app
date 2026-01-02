import { NextRequest, NextResponse } from 'next/server';
import { kakaoPayReady } from '@/lib/kakaopay';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, userId, itemName, quantity, totalAmount } = body;

    // 결제 준비 요청
    const result = await kakaoPayReady({
      orderId,
      userId,
      itemName,
      quantity,
      totalAmount,
      redirectBaseUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/kakaopay`,
    });

    // TID를 임시 저장 (실제로는 DB나 Redis에 저장)
    // 여기서는 클라이언트에 전달하여 세션스토리지에 저장하도록 함

    return NextResponse.json({
      success: true,
      tid: result.tid,
      redirectUrl: result.next_redirect_mobile_url || result.next_redirect_pc_url,
    });
  } catch (error: any) {
    console.error('카카오페이 준비 에러:', error);
    return NextResponse.json(
      { error: error.message || '결제 준비에 실패했습니다.' },
      { status: 500 }
    );
  }
}
