import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const orderId = searchParams.get('orderId');

  // 임시 주문 삭제
  if (orderId) {
    await supabase.from('pending_orders').delete().eq('order_id', orderId);
  }

  // 메인 페이지로 리다이렉트
  return NextResponse.redirect(new URL('/', request.url));
}
