'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { getOrder, getCafeStamp } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { Order, Stamp, User } from '@/lib/supabase';

export default function CheckoutCompletePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const cafeId = params.cafeId as string;
  const orderId = searchParams.get('orderId');

  const [user, setUser] = useState<User | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [stamp, setStamp] = useState<Stamp | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function init() {
      if (!orderId) {
        router.push(`/c/${cafeId}`);
        return;
      }

      const currentUser = await getCurrentUser();
      if (!currentUser) {
        router.push(`/c/${cafeId}`);
        return;
      }
      setUser(currentUser);

      // 주문 정보 조회
      const orderData = await getOrder(orderId);
      if (!orderData) {
        router.push(`/c/${cafeId}`);
        return;
      }
      setOrder(orderData);

      // 스탬프 정보 조회
      const stampData = await getCafeStamp(currentUser.id, orderData.cafe_id);
      setStamp(stampData);

      setIsLoading(false);
    }

    init();
  }, [cafeId, orderId, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cafe-50">
        <div className="w-12 h-12 border-4 border-cafe-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) return null;

  const isRewardEarned = stamp && order.cafe && stamp.count >= order.cafe.stamp_goal;

  return (
    <div className="min-h-screen bg-cafe-50 p-4">
      <div className="max-w-md mx-auto pt-12">
        {/* 성공 아이콘 */}
        <div className="text-center mb-8">
          <div className="text-7xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">주문 완료!</h1>
          <p className="text-gray-600">주문이 접수되었습니다</p>
        </div>

        {/* 주문 정보 */}
        <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
          <div className="text-center mb-4">
            <p className="text-sm text-gray-500">주문번호</p>
            <p className="text-xl font-mono font-bold text-gray-900">{order.order_no}</p>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-bold text-gray-900 mb-3">{order.cafe?.name}</h3>
            {order.items?.map((item, index) => (
              <div key={index} className="flex justify-between text-sm py-1">
                <span className="text-gray-600">
                  {item.menu_name} x {item.quantity}
                </span>
                <span className="text-gray-900">{item.subtotal.toLocaleString()}원</span>
              </div>
            ))}
            <div className="border-t mt-3 pt-3 flex justify-between font-bold">
              <span>총 결제금액</span>
              <span className="text-cafe-500">{order.total_amount.toLocaleString()}원</span>
            </div>
          </div>
        </div>

        {/* 스탬프 적립 */}
        <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="text-3xl">🎁</div>
            <div>
              <p className="font-bold text-gray-900">스탬프 1개 적립!</p>
              {isRewardEarned ? (
                <p className="text-sm text-cafe-500">축하합니다! 무료 음료 쿠폰 획득!</p>
              ) : (
                <p className="text-sm text-gray-500">
                  {stamp && order.cafe
                    ? `${order.cafe.stamp_goal - stamp.count}개 더 모으면 무료 음료!`
                    : '스탬프를 모아보세요!'}
                </p>
              )}
            </div>
          </div>

          {stamp && order.cafe && (
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">현재 스탬프</span>
                <span className="font-bold text-cafe-500">
                  {stamp.count} / {order.cafe.stamp_goal}
                </span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cafe-500 transition-all"
                  style={{ width: `${Math.min(100, (stamp.count / order.cafe.stamp_goal) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* 주문 상태 안내 */}
        <div className="bg-blue-50 rounded-xl p-4 mb-6">
          <p className="text-blue-800 text-center">
            카페에서 주문을 확인 중입니다.<br />
            잠시 후 제조가 시작됩니다.
          </p>
        </div>

        {/* 버튼들 */}
        <div className="space-y-3">
          <button
            onClick={() => router.push(`/orders/${order.id}`)}
            className="w-full py-4 bg-cafe-500 text-white font-bold rounded-xl"
          >
            주문 상태 확인
          </button>
          <button
            onClick={() => router.push(`/c/${cafeId}`)}
            className="w-full py-4 bg-gray-100 text-gray-700 font-bold rounded-xl"
          >
            카페 홈으로
          </button>
        </div>
      </div>
    </div>
  );
}
