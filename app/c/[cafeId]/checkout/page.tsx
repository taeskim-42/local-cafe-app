'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { User } from '@/lib/supabase';

interface CartItem {
  menu: { id: string; name: string; price: number };
  quantity: number;
  selectedOptions: { name: string; choice: string; price: number }[];
  subtotal: number;
}

interface CheckoutData {
  cafeId: string;
  cafeName: string;
  items: CartItem[];
  totalAmount: number;
}

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const cafeId = params.cafeId as string;

  const [user, setUser] = useState<User | null>(null);
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      // 로그인 확인
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        router.push(`/c/${cafeId}`);
        return;
      }
      setUser(currentUser);

      // 세션 스토리지에서 장바구니 데이터 가져오기
      const stored = sessionStorage.getItem('checkout');
      if (!stored) {
        router.push(`/c/${cafeId}/order`);
        return;
      }

      try {
        const data = JSON.parse(stored) as CheckoutData;
        if (data.items.length === 0) {
          router.push(`/c/${cafeId}/order`);
          return;
        }
        setCheckoutData(data);
      } catch {
        router.push(`/c/${cafeId}/order`);
        return;
      }

      setIsLoading(false);
    }

    init();
  }, [cafeId, router]);

  const handlePayment = async () => {
    if (!user || !checkoutData) return;

    setIsProcessing(true);
    setError(null);

    try {
      // 주문번호 생성
      const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const itemName = checkoutData.items.length > 1
        ? `${checkoutData.items[0].menu.name} 외 ${checkoutData.items.length - 1}건`
        : checkoutData.items[0].menu.name;

      // 1. 임시 주문 저장 (pending_orders)
      const pendingRes = await fetch('/api/kakaopay/pending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          userId: user.id,
          cafeId: checkoutData.cafeId,
          items: checkoutData.items,
          totalAmount: checkoutData.totalAmount,
        }),
      });

      if (!pendingRes.ok) {
        throw new Error('주문 정보 저장에 실패했습니다.');
      }

      // 2. 카카오페이 결제 준비
      const readyRes = await fetch('/api/kakaopay/ready', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          userId: user.id,
          itemName,
          quantity: checkoutData.items.reduce((sum, item) => sum + item.quantity, 0),
          totalAmount: checkoutData.totalAmount,
        }),
      });

      const readyData = await readyRes.json();

      if (!readyRes.ok) {
        throw new Error(readyData.error || '결제 준비에 실패했습니다.');
      }

      // 3. TID 저장 (pending_orders 업데이트)
      await fetch('/api/kakaopay/pending', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          tid: readyData.tid,
        }),
      });

      // 4. 카카오페이 결제 페이지로 이동
      sessionStorage.removeItem('checkout');
      window.location.href = readyData.redirectUrl;

    } catch (err: any) {
      setError(err.message || '결제 처리 중 오류가 발생했습니다.');
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cafe-50">
        <div className="w-12 h-12 border-4 border-cafe-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!checkoutData) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* 헤더 */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => router.back()} className="text-gray-600">
            &larr; 뒤로
          </button>
          <h1 className="text-lg font-bold text-gray-900">결제하기</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* 주문 내역 */}
        <section className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-4">{checkoutData.cafeName}</h2>

          <div className="space-y-3">
            {checkoutData.items.map((item, index) => (
              <div key={index} className="flex justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    {item.menu.name} x {item.quantity}
                  </p>
                  {item.selectedOptions.length > 0 && (
                    <p className="text-sm text-gray-500">
                      {item.selectedOptions.map((opt) => opt.choice).join(', ')}
                    </p>
                  )}
                </div>
                <p className="font-medium text-gray-900">{item.subtotal.toLocaleString()}원</p>
              </div>
            ))}
          </div>

          <div className="border-t mt-4 pt-4">
            <div className="flex justify-between text-lg font-bold">
              <span>총 결제금액</span>
              <span className="text-cafe-500">{checkoutData.totalAmount.toLocaleString()}원</span>
            </div>
          </div>
        </section>

        {/* 스탬프 적립 안내 */}
        <section className="bg-amber-50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🎁</div>
            <div>
              <p className="font-bold text-amber-900">스탬프 1개 적립</p>
              <p className="text-sm text-amber-700">결제 완료 시 자동으로 적립됩니다</p>
            </div>
          </div>
        </section>

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl">{error}</div>
        )}
      </main>

      {/* 결제 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="max-w-md mx-auto px-4 py-4">
          <button
            onClick={handlePayment}
            disabled={isProcessing}
            className="w-full py-4 bg-[#FEE500] text-[#000000D9] font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              '결제 준비 중...'
            ) : (
              <>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 4C7.58172 4 4 6.90294 4 10.4444C4 12.6827 5.51832 14.6476 7.79632 15.8068L6.87712 19.1691C6.80432 19.4367 7.10432 19.6487 7.33632 19.4847L11.2675 16.7733C11.5067 16.7911 11.7507 16.8 12 16.8C16.4183 16.8 20 13.8971 20 10.3556C20 6.81396 16.4183 4 12 4Z"
                    fill="#000000D9"
                  />
                </svg>
                카카오페이로 {checkoutData.totalAmount.toLocaleString()}원 결제
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
