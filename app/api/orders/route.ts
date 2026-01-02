import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { addStamp } from '@/lib/api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderNo, userId, cafeId, items, totalAmount, paymentId } = body;

    // 1. 주문 생성
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_no: orderNo,
        user_id: userId,
        cafe_id: cafeId,
        status: 'paid',
        total_amount: totalAmount,
        pay_token: paymentId,
        paid_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (orderError) {
      console.error('Order creation error:', orderError);
      return NextResponse.json({ error: '주문 생성 실패' }, { status: 500 });
    }

    // 2. 주문 항목 생성
    const orderItems = items.map((item: any) => ({
      order_id: order.id,
      menu_id: item.menu.id,
      menu_name: item.menu.name,
      quantity: item.quantity,
      unit_price: item.menu.price,
      options: item.selectedOptions,
      subtotal: item.subtotal,
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(orderItems);

    if (itemsError) {
      console.error('Order items error:', itemsError);
      // 주문은 생성되었으므로 계속 진행
    }

    // 3. 스탬프 적립 (1회 결제 = 1 스탬프)
    try {
      await addStamp({
        userId,
        cafeId,
        source: 'order',
        orderId: order.id,
      });
    } catch (stampError) {
      console.error('Stamp error:', stampError);
      // 스탬프 적립 실패해도 주문은 성공으로 처리
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNo: order.order_no,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
