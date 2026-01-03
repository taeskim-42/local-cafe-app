'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCafe, getCafeOrders, updateOrderStatus } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { loginWithKakao } from '@/lib/kakao';
import { supabase, Cafe, Order, User } from '@/lib/supabase';

const STATUS_LABELS: Record<string, string> = {
  paid: '결제완료',
  accepted: '접수됨',
  preparing: '제조중',
  ready: '준비완료',
  picked_up: '픽업완료',
  cancelled: '취소됨',
};

const STATUS_COLORS: Record<string, string> = {
  paid: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-blue-100 text-blue-800',
  preparing: 'bg-purple-100 text-purple-800',
  ready: 'bg-green-100 text-green-800',
  picked_up: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-800',
};

export default function MerchantOrdersPage() {
  const params = useParams();
  const router = useRouter();
  const cafeId = params.cafeId as string;

  const [user, setUser] = useState<User | null>(null);
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [filter, setFilter] = useState<string>('active'); // 'active' | 'all'

  const checkAuth = useCallback(async (currentUser: User | null) => {
    if (!currentUser) {
      setNeedsLogin(true);
      setIsLoading(false);
      return;
    }
    setUser(currentUser);
    setNeedsLogin(false);

    const cafeData = await getCafe(cafeId);
    if (!cafeData) {
      setError('카페를 찾을 수 없습니다.');
      setIsLoading(false);
      return;
    }

    if (cafeData.owner_id !== currentUser.id) {
      setError('이 카페의 관리 권한이 없습니다.');
      setIsLoading(false);
      return;
    }

    setCafe(cafeData);

    // 주문 목록 조회
    const orderList = await getCafeOrders(cafeData.id);
    setOrders(orderList);
    setIsLoading(false);
  }, [cafeId]);

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      try {
        const currentUser = await getCurrentUser();
        await checkAuth(currentUser);
      } catch (err) {
        setError('데이터를 불러오는데 실패했습니다.');
        setIsLoading(false);
      }
    }

    init();
  }, [cafeId, checkAuth]);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const loggedInUser = await loginWithKakao();
      await checkAuth(loggedInUser);
    } catch (err) {
      setError('로그인에 실패했습니다.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // 실시간 주문 구독
  useEffect(() => {
    if (!cafe) return;

    const channel = supabase
      .channel('orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `cafe_id=eq.${cafe.id}`,
        },
        async (payload) => {
          // 주문 목록 새로고침
          const orderList = await getCafeOrders(cafe.id);
          setOrders(orderList);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cafe]);

  const handleStatusChange = async (orderId: string, newStatus: Order['status']) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      setOrders((prev) =>
        prev.map((order) => (order.id === orderId ? { ...order, status: newStatus } : order))
      );
    } catch (err) {
      alert('상태 변경에 실패했습니다.');
    }
  };

  const getNextStatus = (currentStatus: string): Order['status'] | null => {
    switch (currentStatus) {
      case 'paid':
        return 'accepted';
      case 'accepted':
        return 'preparing';
      case 'preparing':
        return 'ready';
      case 'ready':
        return 'picked_up';
      default:
        return null;
    }
  };

  const getNextStatusLabel = (currentStatus: string): string => {
    switch (currentStatus) {
      case 'paid':
        return '주문 접수';
      case 'accepted':
        return '제조 시작';
      case 'preparing':
        return '준비 완료';
      case 'ready':
        return '픽업 완료';
      default:
        return '';
    }
  };

  // 필터링된 주문
  const filteredOrders = orders.filter((order) => {
    if (filter === 'active') {
      return ['paid', 'accepted', 'preparing', 'ready'].includes(order.status);
    }
    return true;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-cafe-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // 로그인 필요
  if (needsLogin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-6">👨‍💼</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">사장님 전용</h1>
          <p className="text-gray-600 mb-6">
            주문 관리를 위해 로그인이 필요합니다
          </p>
          <button
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="w-full py-4 bg-yellow-400 text-yellow-900 font-bold rounded-xl hover:bg-yellow-500 disabled:opacity-50"
          >
            {isLoggingIn ? '로그인 중...' : '카카오로 로그인'}
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-gray-600 mb-4">{error}</p>
          {user && (
            <p className="text-sm text-gray-400">
              로그인: {user.name}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900">{cafe?.name}</h1>
              <p className="text-sm text-gray-500">주문 관리</p>
            </div>
            <button
              onClick={() => router.push(`/merchant/${cafeId}`)}
              className="text-sm text-cafe-500"
            >
              스탬프 적립
            </button>
          </div>

          {/* 필터 탭 */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setFilter('active')}
              className={`px-4 py-2 rounded-full text-sm font-medium ${
                filter === 'active'
                  ? 'bg-cafe-500 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              진행중
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium ${
                filter === 'all'
                  ? 'bg-cafe-500 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              전체
            </button>
          </div>
        </div>
      </header>

      {/* 주문 목록 */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📋</div>
            <p className="text-gray-600">
              {filter === 'active' ? '진행중인 주문이 없습니다' : '주문 내역이 없습니다'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const nextStatus = getNextStatus(order.status);
              const nextLabel = getNextStatusLabel(order.status);

              return (
                <div key={order.id} className="bg-white rounded-xl p-4 shadow-sm">
                  {/* 주문 헤더 */}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="font-mono font-bold text-gray-900">
                        #{order.order_no.slice(-6)}
                      </span>
                      <span
                        className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                          STATUS_COLORS[order.status]
                        }`}
                      >
                        {STATUS_LABELS[order.status]}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleTimeString('ko-KR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* 주문 항목 */}
                  <div className="space-y-1 mb-4">
                    {order.items?.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-gray-700">
                          {item.menu_name} x {item.quantity}
                          {item.options && item.options.length > 0 && (
                            <span className="text-gray-400 ml-1">
                              ({item.options.map((o: any) => o.choice).join(', ')})
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* 총 금액 */}
                  <div className="border-t pt-3 flex justify-between items-center">
                    <span className="font-bold text-gray-900">
                      {order.total_amount.toLocaleString()}원
                    </span>

                    {/* 상태 변경 버튼 */}
                    {nextStatus && (
                      <button
                        onClick={() => handleStatusChange(order.id, nextStatus)}
                        className="px-4 py-2 bg-cafe-500 text-white text-sm font-bold rounded-lg"
                      >
                        {nextLabel}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
