'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getOrder, getCafe } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { supabase, Order, Cafe, User } from '@/lib/supabase';

const STATUS_INFO: Record<string, { label: string; emoji: string; message: string; color: string }> = {
  paid: {
    label: '결제완료',
    emoji: '💳',
    message: '주문이 접수 대기 중입니다',
    color: 'text-yellow-600',
  },
  accepted: {
    label: '주문접수',
    emoji: '✅',
    message: '주문이 확인되었습니다',
    color: 'text-blue-600',
  },
  preparing: {
    label: '제조중',
    emoji: '☕',
    message: '음료를 만들고 있어요',
    color: 'text-purple-600',
  },
  ready: {
    label: '준비완료',
    emoji: '🔔',
    message: '음료가 준비되었습니다!',
    color: 'text-green-600',
  },
  picked_up: {
    label: '픽업완료',
    emoji: '👋',
    message: '맛있게 드세요!',
    color: 'text-gray-600',
  },
  cancelled: {
    label: '취소됨',
    emoji: '❌',
    message: '주문이 취소되었습니다',
    color: 'text-red-600',
  },
};

const STATUS_STEPS = ['paid', 'accepted', 'preparing', 'ready', 'picked_up'];

export default function OrderStatusPage() {
  const params = useParams();
  const router = useRouter();
  const cafeId = params.cafeId as string;
  const orderId = params.orderId as string;

  const [user, setUser] = useState<User | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          router.push(`/c/${cafeId}`);
          return;
        }
        setUser(currentUser);

        const orderData = await getOrder(orderId);
        if (!orderData) {
          setError('주문을 찾을 수 없습니다.');
          return;
        }
        setOrder(orderData);

        const cafeData = await getCafe(orderData.cafe_id);
        setCafe(cafeData);
      } catch (err) {
        setError('데이터를 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, [cafeId, orderId, router]);

  // 실시간 주문 상태 구독
  useEffect(() => {
    if (!order) return;

    const channel = supabase
      .channel(`order-${order.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${order.id}`,
        },
        (payload) => {
          const newOrder = payload.new as Order;
          setOrder((prev) => (prev ? { ...prev, ...newOrder } : null));

          // 상태 변경 시 알림
          if (newOrder.status === 'ready') {
            // 브라우저 알림 (권한이 있는 경우)
            if (Notification.permission === 'granted') {
              new Notification('음료 준비 완료!', {
                body: '카운터에서 음료를 픽업해주세요',
                icon: '/icon-192x192.png',
              });
            }
            // 진동 (모바일)
            if (navigator.vibrate) {
              navigator.vibrate([200, 100, 200]);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [order?.id]);

  // 알림 권한 요청
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cafe-50">
        <div className="w-12 h-12 border-4 border-cafe-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cafe-50 p-4">
        <div className="text-center">
          <div className="text-5xl mb-4">😅</div>
          <p className="text-gray-600">{error || '주문을 찾을 수 없습니다'}</p>
          <button
            onClick={() => router.push(`/c/${cafeId}`)}
            className="mt-4 px-6 py-2 bg-cafe-500 text-white rounded-lg"
          >
            카페 홈으로
          </button>
        </div>
      </div>
    );
  }

  const statusInfo = STATUS_INFO[order.status] || STATUS_INFO.paid;
  const currentStepIndex = STATUS_STEPS.indexOf(order.status);

  return (
    <div className="min-h-screen bg-cafe-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button onClick={() => router.back()} className="text-gray-600">
              ← 뒤로
            </button>
            <h1 className="font-bold text-gray-900">주문 상태</h1>
            <div className="w-10" />
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6">
        {/* 현재 상태 */}
        <div className="bg-white rounded-2xl p-8 shadow-lg mb-6 text-center">
          <div className={`text-7xl mb-4 ${order.status === 'ready' ? 'animate-bounce' : ''}`}>
            {statusInfo.emoji}
          </div>
          <h2 className={`text-2xl font-bold mb-2 ${statusInfo.color}`}>
            {statusInfo.label}
          </h2>
          <p className="text-gray-600">{statusInfo.message}</p>

          {order.status === 'ready' && (
            <div className="mt-4 p-4 bg-green-50 rounded-xl">
              <p className="text-green-700 font-bold">
                카운터에서 픽업해주세요!
              </p>
            </div>
          )}
        </div>

        {/* 주문번호 */}
        <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-1">주문번호</p>
            <p className="text-2xl font-mono font-bold text-gray-900">
              {order.order_no}
            </p>
          </div>
        </div>

        {/* 진행 상태 바 */}
        {order.status !== 'cancelled' && (
          <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
            <div className="flex justify-between relative">
              {/* 연결선 */}
              <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200" />
              <div
                className="absolute top-4 left-0 h-0.5 bg-cafe-500 transition-all duration-500"
                style={{ width: `${(currentStepIndex / (STATUS_STEPS.length - 1)) * 100}%` }}
              />

              {STATUS_STEPS.map((status, index) => {
                const isCompleted = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;
                const info = STATUS_INFO[status];

                return (
                  <div key={status} className="relative flex flex-col items-center z-10">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm
                        ${isCompleted ? 'bg-cafe-500 text-white' : 'bg-gray-200 text-gray-400'}
                        ${isCurrent ? 'ring-4 ring-cafe-200' : ''}
                      `}
                    >
                      {isCompleted ? '✓' : index + 1}
                    </div>
                    <span className={`text-xs mt-2 ${isCurrent ? 'font-bold text-cafe-500' : 'text-gray-400'}`}>
                      {info.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 주문 내역 */}
        <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
          <h3 className="font-bold text-gray-900 mb-3">{cafe?.name}</h3>
          {order.items?.map((item, index) => (
            <div key={index} className="flex justify-between text-sm py-2 border-b last:border-0">
              <span className="text-gray-700">
                {item.menu_name} x {item.quantity}
              </span>
              <span className="text-gray-900">{item.subtotal.toLocaleString()}원</span>
            </div>
          ))}
          <div className="flex justify-between font-bold mt-3 pt-3 border-t">
            <span>총 금액</span>
            <span className="text-cafe-500">{order.total_amount.toLocaleString()}원</span>
          </div>
        </div>

        {/* 홈으로 버튼 */}
        <button
          onClick={() => router.push(`/c/${cafeId}`)}
          className="w-full py-4 bg-gray-100 text-gray-700 font-bold rounded-xl"
        >
          카페 홈으로
        </button>
      </main>
    </div>
  );
}
