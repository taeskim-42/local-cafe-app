import { NextRequest, NextResponse } from 'next/server';
import { kakaoPayApprove } from '@/lib/kakaopay';
import { supabase } from '@/lib/supabase';
import { addStamp } from '@/lib/api';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const pgToken = searchParams.get('pg_token');
  const orderId = searchParams.get('orderId');

  if (!pgToken || !orderId) {
    return NextResponse.redirect(new URL('/checkout/fail', request.url));
  }

  try {
    // 임시 주문 정보 조회
    const { data: pendingOrder } = await supabase
      .from('pending_orders')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (!pendingOrder) {
      throw new Error('주문 정보를 찾을 수 없습니다.');
    }

    // 카카오페이 결제 승인
    const approveResult = await kakaoPayApprove({
      tid: pendingOrder.tid,
      orderId,
      userId: pendingOrder.user_id,
      pgToken,
    });

    // 실제 주문 생성
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_no: orderId,
        user_id: pendingOrder.user_id,
        cafe_id: pendingOrder.cafe_id,
        status: 'paid',
        total_amount: approveResult.amount.total,
        pay_token: approveResult.tid,
        paid_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (orderError) {
      throw new Error('주문 생성 실패');
    }

    // 주문 항목 생성
    const items = JSON.parse(pendingOrder.items);
    const orderItems = items.map((item: any) => ({
      order_id: order.id,
      menu_id: item.menu.id,
      menu_name: item.menu.name,
      quantity: item.quantity,
      unit_price: item.menu.price,
      options: item.selectedOptions || [],
      subtotal: item.subtotal,
    }));

    await supabase.from('order_items').insert(orderItems);

    // 스탬프 적립
    await addStamp({
      userId: pendingOrder.user_id,
      cafeId: pendingOrder.cafe_id,
      source: 'order',
      orderId: order.id,
    });

    // 임시 주문 삭제
    await supabase.from('pending_orders').delete().eq('order_id', orderId);

    // 완료 페이지로 리다이렉트
    return NextResponse.redirect(
      new URL(`/c/${pendingOrder.cafe_id}/checkout/complete?orderId=${order.id}`, request.url)
    );
  } catch (error: any) {
    console.error('카카오페이 승인 에러:', error);
    return NextResponse.redirect(
      new URL(`/checkout/fail?error=${encodeURIComponent(error.message)}`, request.url)
    );
  }
}
