'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCafe, createStampToken } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { loginWithKakao } from '@/lib/kakao';
import { supabase, Cafe, User } from '@/lib/supabase';

export default function MerchantStampPage() {
  const params = useParams();
  const router = useRouter();
  const cafeId = params.cafeId as string;

  const [user, setUser] = useState<User | null>(null);
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // 토큰 상태
  const [activeToken, setActiveToken] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [isCreating, setIsCreating] = useState(false);

  // 주문 뱃지
  const [pendingOrderCount, setPendingOrderCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

    // 권한 확인 (카페 소유자인지)
    if (cafeData.owner_id !== currentUser.id) {
      setError('이 카페의 관리 권한이 없습니다.');
      setIsLoading(false);
      return;
    }

    setCafe(cafeData);
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

  // 카운트다운 타이머
  useEffect(() => {
    if (countdown <= 0) {
      setActiveToken(null);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  // 대기 주문 수 조회 및 실시간 구독
  useEffect(() => {
    if (!cafe) return;

    const cafeId = cafe.id;
    const cafeName = cafe.name;

    // 초기 조회
    async function fetchPendingOrders() {
      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('cafe_id', cafeId)
        .in('status', ['paid', 'accepted', 'preparing']);

      setPendingOrderCount(count || 0);
    }

    fetchPendingOrders();

    // 실시간 구독
    const channel = supabase
      .channel('merchant-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `cafe_id=eq.${cafeId}`,
        },
        async (payload) => {
          // 새 주문이면 소리 재생
          if (payload.eventType === 'INSERT') {
            audioRef.current?.play().catch(() => {});
            // 브라우저 탭 제목 변경
            document.title = '🔔 새 주문! - ' + cafeName;
            setTimeout(() => {
              document.title = cafeName + ' - 사장님 모드';
            }, 5000);
          }
          // 주문 수 새로고침
          fetchPendingOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cafe]);

  const handleCreateToken = useCallback(async () => {
    if (!user || !cafe) return;

    setIsCreating(true);
    try {
      const { token, expiresAt } = await createStampToken({
        cafeId: cafe.id,
        merchantId: user.id,
      });

      setActiveToken(token);
      const remainingSeconds = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
      setCountdown(remainingSeconds);
    } catch (err) {
      alert('토큰 생성에 실패했습니다.');
    } finally {
      setIsCreating(false);
    }
  }, [user, cafe]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cafe-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">로딩 중...</p>
        </div>
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
            카페 관리를 위해 로그인이 필요합니다
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
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900">{cafe?.name}</h1>
              <p className="text-sm text-gray-500">사장님 모드</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.push(`/merchant/${cafeId}/orders`)}
                className="relative px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg"
              >
                주문
                {pendingOrderCount > 0 && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {pendingOrderCount > 9 ? '9+' : pendingOrderCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => router.push(`/merchant/${cafeId}/settings`)}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg"
              >
                설정
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6">
        {/* 적립 허용 카드 */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-center text-gray-900 mb-6">
            스탬프 적립
          </h2>

          {activeToken ? (
            // 토큰 활성화 상태
            <div className="text-center">
              <div className="mb-4">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-100 mb-4">
                  <span className="text-4xl">✅</span>
                </div>
              </div>

              <p className="text-gray-600 mb-2">고객에게 NFC 태그를 안내해주세요</p>

              <div className="bg-gray-100 rounded-xl p-4 mb-4">
                <p className="text-sm text-gray-500 mb-1">토큰 코드</p>
                <p className="text-3xl font-mono font-bold text-cafe-500 tracking-wider">
                  {activeToken}
                </p>
              </div>

              {/* 카운트다운 */}
              <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                <div
                  className="absolute left-0 top-0 h-full bg-cafe-500 transition-all duration-1000"
                  style={{ width: `${(countdown / 30) * 100}%` }}
                />
              </div>
              <p className="text-sm text-gray-500">
                {countdown}초 후 만료
              </p>
            </div>
          ) : (
            // 대기 상태
            <div className="text-center">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-cafe-100 mb-4">
                  <span className="text-6xl">☕</span>
                </div>
                <p className="text-gray-600">
                  결제 완료 후 아래 버튼을 눌러주세요
                </p>
              </div>

              <button
                onClick={handleCreateToken}
                disabled={isCreating}
                className="w-full py-4 bg-cafe-500 text-white text-lg font-bold rounded-xl hover:bg-cafe-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? '처리 중...' : '적립 허용'}
              </button>

              <p className="text-xs text-gray-400 mt-4">
                버튼을 누르면 30초간 NFC 적립이 활성화됩니다
              </p>
            </div>
          )}
        </div>

        {/* 오늘 적립 현황 */}
        <div className="mt-6 bg-white rounded-2xl shadow p-4">
          <h3 className="font-bold text-gray-900 mb-3">오늘 적립 현황</h3>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">적립 횟수</span>
            <span className="text-2xl font-bold text-cafe-500">-</span>
          </div>
        </div>

        {/* NFC 태그 URL 안내 */}
        <div className="mt-6 bg-blue-50 rounded-xl p-4">
          <h3 className="font-bold text-blue-900 mb-2">NFC 태그 설정</h3>
          <p className="text-sm text-blue-700 mb-2">
            NFC 태그에 아래 URL을 등록하세요:
          </p>
          <code className="block bg-white rounded p-2 text-xs text-gray-600 break-all">
            {typeof window !== 'undefined' ? window.location.origin : ''}/c/{cafe?.short_code || cafeId}/tap
          </code>
        </div>
      </main>

      {/* 알림 소리 */}
      <audio
        ref={audioRef}
        src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"
        preload="auto"
      />
    </div>
  );
}
