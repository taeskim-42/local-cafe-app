/**
 * 카카오페이 결제 API
 * 테스트 CID: TC0ONETIME
 */

const KAKAO_PAY_HOST = 'https://open-api.kakaopay.com';
const TEST_CID = 'TC0ONETIME'; // 테스트용 CID

// 카카오페이 Secret Key (서버에서만 사용)
const SECRET_KEY = process.env.KAKAOPAY_SECRET_KEY || '';

interface KakaoPayReadyParams {
  orderId: string;
  userId: string;
  itemName: string;
  quantity: number;
  totalAmount: number;
  redirectBaseUrl: string;
}

interface KakaoPayReadyResponse {
  tid: string; // 결제 고유번호
  next_redirect_app_url: string; // 앱 리다이렉트 URL
  next_redirect_mobile_url: string; // 모바일 리다이렉트 URL
  next_redirect_pc_url: string; // PC 리다이렉트 URL
  android_app_scheme: string;
  ios_app_scheme: string;
  created_at: string;
}

interface KakaoPayApproveParams {
  tid: string;
  orderId: string;
  userId: string;
  pgToken: string;
}

interface KakaoPayApproveResponse {
  aid: string;
  tid: string;
  cid: string;
  partner_order_id: string;
  partner_user_id: string;
  payment_method_type: string;
  amount: {
    total: number;
    tax_free: number;
    vat: number;
  };
  item_name: string;
  quantity: number;
  created_at: string;
  approved_at: string;
}

/**
 * 카카오페이 결제 준비
 */
export async function kakaoPayReady(params: KakaoPayReadyParams): Promise<KakaoPayReadyResponse> {
  const { orderId, userId, itemName, quantity, totalAmount, redirectBaseUrl } = params;

  const response = await fetch(`${KAKAO_PAY_HOST}/online/v1/payment/ready`, {
    method: 'POST',
    headers: {
      'Authorization': `SECRET_KEY ${SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      cid: TEST_CID,
      partner_order_id: orderId,
      partner_user_id: userId,
      item_name: itemName,
      quantity,
      total_amount: totalAmount,
      tax_free_amount: 0,
      approval_url: `${redirectBaseUrl}/success?orderId=${orderId}`,
      cancel_url: `${redirectBaseUrl}/cancel?orderId=${orderId}`,
      fail_url: `${redirectBaseUrl}/fail?orderId=${orderId}`,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('카카오페이 준비 실패:', errorData);
    throw new Error(errorData.msg || '결제 준비에 실패했습니다.');
  }

  return response.json();
}

/**
 * 카카오페이 결제 승인
 */
export async function kakaoPayApprove(params: KakaoPayApproveParams): Promise<KakaoPayApproveResponse> {
  const { tid, orderId, userId, pgToken } = params;

  const response = await fetch(`${KAKAO_PAY_HOST}/online/v1/payment/approve`, {
    method: 'POST',
    headers: {
      'Authorization': `SECRET_KEY ${SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      cid: TEST_CID,
      tid,
      partner_order_id: orderId,
      partner_user_id: userId,
      pg_token: pgToken,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('카카오페이 승인 실패:', errorData);
    throw new Error(errorData.msg || '결제 승인에 실패했습니다.');
  }

  return response.json();
}
