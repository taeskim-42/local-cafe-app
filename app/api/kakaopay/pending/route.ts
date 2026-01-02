import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// POST: 임시 주문 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, userId, cafeId, items, totalAmount } = body;

    const { error } = await supabase.from('pending_orders').insert({
      order_id: orderId,
      user_id: userId,
      cafe_id: cafeId,
      items: JSON.stringify(items),
      total_amount: totalAmount,
      tid: '', // 나중에 업데이트
    });

    if (error) {
      console.error('임시 주문 저장 실패:', error);
      return NextResponse.json({ error: '주문 정보 저장 실패' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API 에러:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

// PATCH: TID 업데이트
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, tid } = body;

    const { error } = await supabase
      .from('pending_orders')
      .update({ tid })
      .eq('order_id', orderId);

    if (error) {
      console.error('TID 업데이트 실패:', error);
      return NextResponse.json({ error: 'TID 업데이트 실패' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API 에러:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
