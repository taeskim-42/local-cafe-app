import { supabase, Cafe, Menu, Stamp, Order, OrderItem, User, StampToken } from './supabase';

// 스탬프 적립 결과
export interface StampResult {
  stamp: Stamp;
  isRewardEarned: boolean;
  currentCount: number;
  goalCount: number;
}

// 스탬프 적립 소스
export type StampSource = 'order' | 'customer_scan' | 'merchant_manual';

/**
 * 카페 목록 조회 (승인된 카페만)
 */
export async function getCafes(): Promise<Cafe[]> {
  const { data, error } = await supabase
    .from('cafes')
    .select('*')
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('카페 목록 조회 실패:', error);
    return [];
  }

  return data as Cafe[];
}

/**
 * 카페 상세 조회
 */
export async function getCafe(cafeId: string): Promise<Cafe | null> {
  const { data, error } = await supabase
    .from('cafes')
    .select('*')
    .eq('id', cafeId)
    .single();

  if (error) {
    console.error('카페 조회 실패:', error);
    return null;
  }

  return data as Cafe;
}

/**
 * 카페 정보 수정
 */
export async function updateCafe(
  cafeId: string,
  updates: Partial<Pick<Cafe, 'name' | 'address' | 'stamp_goal' | 'image_url'>>
): Promise<Cafe> {
  const { data, error } = await supabase
    .from('cafes')
    .update(updates)
    .eq('id', cafeId)
    .select()
    .single();

  if (error) {
    console.error('카페 수정 실패:', error);
    throw new Error(`카페 수정 실패: ${error.message}`);
  }

  return data as Cafe;
}

/**
 * 카페 메뉴 조회
 */
export async function getMenus(cafeId: string): Promise<Menu[]> {
  const { data, error } = await supabase
    .from('menus')
    .select('*')
    .eq('cafe_id', cafeId)
    .eq('is_available', true)
    .order('category', { ascending: true });

  if (error) {
    console.error('메뉴 조회 실패:', error);
    return [];
  }

  return data as Menu[];
}

/**
 * 사용자의 모든 스탬프 조회 (카페 정보 포함)
 */
export async function getUserStamps(userId: string): Promise<Stamp[]> {
  const { data, error } = await supabase
    .from('stamps')
    .select(`
      *,
      cafe:cafes(*)
    `)
    .eq('user_id', userId)
    .order('count', { ascending: false });

  if (error) {
    console.error('스탬프 조회 실패:', error);
    return [];
  }

  return data as Stamp[];
}

/**
 * 특정 카페의 스탬프 조회
 */
export async function getCafeStamp(userId: string, cafeId: string): Promise<Stamp | null> {
  const { data, error } = await supabase
    .from('stamps')
    .select(`
      *,
      cafe:cafes(*)
    `)
    .eq('user_id', userId)
    .eq('cafe_id', cafeId)
    .single();

  if (error) {
    return null;
  }

  return data as Stamp;
}

/**
 * 사용자 주문 목록 조회
 */
export async function getUserOrders(userId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      cafe:cafes(*),
      items:order_items(*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('주문 조회 실패:', error);
    return [];
  }

  return data as Order[];
}

/**
 * 주문 상세 조회
 */
export async function getOrder(orderId: string): Promise<Order | null> {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      cafe:cafes(*),
      items:order_items(*)
    `)
    .eq('id', orderId)
    .single();

  if (error) {
    console.error('주문 조회 실패:', error);
    return null;
  }

  return data as Order;
}

/**
 * 사장님: 내 카페 목록 조회
 */
export async function getOwnerCafes(ownerId: string): Promise<Cafe[]> {
  const { data, error } = await supabase
    .from('cafes')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('카페 목록 조회 실패:', error);
    return [];
  }

  return data as Cafe[];
}

/**
 * 사장님: 카페 주문 목록 조회
 */
export async function getCafeOrders(cafeId: string, status?: string): Promise<Order[]> {
  let query = supabase
    .from('orders')
    .select(`
      *,
      items:order_items(*)
    `)
    .eq('cafe_id', cafeId)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('주문 조회 실패:', error);
    return [];
  }

  return data as Order[];
}

/**
 * 주문 상태 업데이트
 */
export async function updateOrderStatus(
  orderId: string,
  status: Order['status']
): Promise<Order | null> {
  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .select()
    .single();

  if (error) {
    console.error('주문 상태 업데이트 실패:', error);
    return null;
  }

  return data as Order;
}

/**
 * short_code로 카페 조회 (NFC/QR용)
 */
export async function getCafeByShortCode(shortCode: string): Promise<Cafe | null> {
  const { data, error } = await supabase
    .from('cafes')
    .select('*')
    .eq('short_code', shortCode)
    .single();

  if (error) {
    console.error('카페 조회 실패:', error);
    return null;
  }

  return data as Cafe;
}

/**
 * 스탬프 적립
 * - 중복 방지 (5분 쿨다운)
 * - 일일 한도 체크 (3회)
 */
export async function addStamp(params: {
  userId: string;
  cafeId: string;
  source: StampSource;
  orderId?: string;
  merchantId?: string;
}): Promise<StampResult> {
  const { userId, cafeId, source, orderId, merchantId } = params;

  // 1. 카페 정보 조회 (stamp_goal 확인)
  const cafe = await getCafe(cafeId);
  if (!cafe) {
    throw new Error('카페를 찾을 수 없습니다.');
  }

  // 2. 고객 스캔인 경우에만 제한 적용
  if (source === 'customer_scan') {
    // 2-1. 중복 적립 방지 (5분 쿨다운)
    const { data: recentHistory } = await supabase
      .from('stamp_history')
      .select(`
        *,
        stamp:stamps!inner(user_id, cafe_id)
      `)
      .eq('stamp.user_id', userId)
      .eq('stamp.cafe_id', cafeId)
      .eq('type', 'earn')
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .limit(1);

    if (recentHistory && recentHistory.length > 0) {
      throw new Error('이미 최근에 적립되었습니다. 5분 후 다시 시도해주세요.');
    }

    // 2-2. 일일 한도 체크 (3회)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: todayHistory, error: countError } = await supabase
      .from('stamp_history')
      .select(`
        *,
        stamp:stamps!inner(user_id, cafe_id)
      `)
      .eq('stamp.user_id', userId)
      .eq('stamp.cafe_id', cafeId)
      .eq('type', 'earn')
      .gte('created_at', today.toISOString());

    if (todayHistory && todayHistory.length >= 3) {
      throw new Error('오늘 적립 한도(3회)에 도달했습니다.');
    }
  }

  // 3. 스탬프 레코드 조회 또는 생성
  let stamp = await getCafeStamp(userId, cafeId);

  if (!stamp) {
    const { data: newStamp, error: createError } = await supabase
      .from('stamps')
      .insert({
        user_id: userId,
        cafe_id: cafeId,
        count: 0,
        total_earned: 0,
        total_used: 0,
      })
      .select()
      .single();

    if (createError) {
      throw new Error('스탬프 생성 실패');
    }
    stamp = newStamp as Stamp;
  }

  // 4. 스탬프 증가
  const newCount = stamp.count + 1;
  const { data: updatedStamp, error: updateError } = await supabase
    .from('stamps')
    .update({
      count: newCount,
      total_earned: stamp.total_earned + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', stamp.id)
    .select()
    .single();

  if (updateError) {
    throw new Error('스탬프 업데이트 실패');
  }

  // 5. 히스토리 기록
  await supabase.from('stamp_history').insert({
    stamp_id: stamp.id,
    order_id: orderId || null,
    type: 'earn',
    amount: 1,
    source,
    merchant_id: merchantId || null,
  });

  // 6. 리워드 달성 여부 확인
  const isRewardEarned = newCount >= cafe.stamp_goal;

  // 7. Wallet Pass 업데이트 (비동기로 처리) - 추후 서버 API로 이동 예정
  // updateWalletPassesAfterStamp(userId, cafeId, updatedStamp as Stamp);

  return {
    stamp: updatedStamp as Stamp,
    isRewardEarned,
    currentCount: newCount,
    goalCount: cafe.stamp_goal,
  };
}

// Wallet Pass 업데이트 기능은 서버 API로 이동 예정
// 현재는 스탬프 적립만 처리

/**
 * 스탬프 사용 (쿠폰 사용)
 */
export async function useStampReward(params: {
  userId: string;
  cafeId: string;
  orderId?: string;
}): Promise<{ stamp: Stamp; remainingCount: number }> {
  const { userId, cafeId, orderId } = params;

  // 카페 정보 조회
  const cafe = await getCafe(cafeId);
  if (!cafe) {
    throw new Error('카페를 찾을 수 없습니다.');
  }

  // 스탬프 조회
  const stamp = await getCafeStamp(userId, cafeId);
  if (!stamp) {
    throw new Error('스탬프가 없습니다.');
  }

  if (stamp.count < cafe.stamp_goal) {
    throw new Error('스탬프가 부족합니다.');
  }

  // 스탬프 차감
  const newCount = stamp.count - cafe.stamp_goal;
  const { data: updatedStamp, error: updateError } = await supabase
    .from('stamps')
    .update({
      count: newCount,
      total_used: stamp.total_used + cafe.stamp_goal,
      updated_at: new Date().toISOString(),
    })
    .eq('id', stamp.id)
    .select()
    .single();

  if (updateError) {
    throw new Error('스탬프 사용 실패');
  }

  // 히스토리 기록
  await supabase.from('stamp_history').insert({
    stamp_id: stamp.id,
    order_id: orderId || null,
    type: 'use',
    amount: cafe.stamp_goal,
  });

  return {
    stamp: updatedStamp as Stamp,
    remainingCount: newCount,
  };
}

// ============================================
// NFC 적립 토큰 관련 API
// ============================================

/**
 * 6자리 랜덤 토큰 생성
 */
function generateToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 혼동되는 문자 제외 (0,O,1,I)
  let token = '';
  for (let i = 0; i < 6; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * 사장님: 적립 허용 토큰 생성
 * - 30초간 유효
 * - 1회만 사용 가능
 */
export async function createStampToken(params: {
  cafeId: string;
  merchantId: string;
}): Promise<{ token: string; expiresAt: Date }> {
  const { cafeId, merchantId } = params;

  // 기존 미사용 토큰 만료 처리 (같은 카페의)
  await supabase
    .from('stamp_tokens')
    .delete()
    .eq('cafe_id', cafeId)
    .is('used_by', null)
    .lt('expires_at', new Date().toISOString());

  // 새 토큰 생성
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 1000); // 30초 후 만료

  const { error } = await supabase.from('stamp_tokens').insert({
    cafe_id: cafeId,
    token,
    created_by: merchantId,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    throw new Error('토큰 생성 실패');
  }

  return { token, expiresAt };
}

/**
 * 고객: 토큰으로 스탬프 적립 (토큰 코드 입력 방식)
 */
export async function redeemStampToken(params: {
  cafeId: string;
  token: string;
  userId: string;
}): Promise<StampResult> {
  const { cafeId, token, userId } = params;

  // 1. 토큰 유효성 확인
  const { data: tokenData, error: tokenError } = await supabase
    .from('stamp_tokens')
    .select('*')
    .eq('cafe_id', cafeId)
    .eq('token', token.toUpperCase())
    .is('used_by', null)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (tokenError || !tokenData) {
    throw new Error('유효하지 않거나 만료된 토큰입니다.');
  }

  // 2. 토큰 사용 처리
  const { error: updateError } = await supabase
    .from('stamp_tokens')
    .update({
      used_by: userId,
      used_at: new Date().toISOString(),
    })
    .eq('id', tokenData.id);

  if (updateError) {
    throw new Error('토큰 사용 처리 실패');
  }

  // 3. 스탬프 적립
  const result = await addStamp({
    userId,
    cafeId,
    source: 'merchant_manual',
    merchantId: tokenData.created_by,
  });

  return result;
}

/**
 * 사장님: 현재 활성 토큰 조회
 */
export async function getActiveStampToken(cafeId: string): Promise<StampToken | null> {
  const { data, error } = await supabase
    .from('stamp_tokens')
    .select('*')
    .eq('cafe_id', cafeId)
    .is('used_by', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return data as StampToken;
}

/**
 * 고객: NFC 탭 시 자동 적립 (활성 토큰 자동 사용)
 * - 해당 카페에 활성 토큰이 있으면 자동 적립
 * - 없으면 에러 반환
 */
export async function autoRedeemStamp(params: {
  cafeId: string;
  userId: string;
}): Promise<StampResult> {
  const { cafeId, userId } = params;

  // 1. 활성 토큰 확인
  const { data: tokenData, error: tokenError } = await supabase
    .from('stamp_tokens')
    .select('*')
    .eq('cafe_id', cafeId)
    .is('used_by', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (tokenError || !tokenData) {
    throw new Error('적립 대기 중이 아닙니다. 직원에게 적립을 요청해주세요.');
  }

  // 2. 토큰 사용 처리
  const { error: updateError } = await supabase
    .from('stamp_tokens')
    .update({
      used_by: userId,
      used_at: new Date().toISOString(),
    })
    .eq('id', tokenData.id);

  if (updateError) {
    throw new Error('적립 처리에 실패했습니다.');
  }

  // 3. 스탬프 적립
  const result = await addStamp({
    userId,
    cafeId,
    source: 'merchant_manual',
    merchantId: tokenData.created_by,
  });

  return result;
}
