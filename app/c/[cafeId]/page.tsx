'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getCafeByShortCode, getCafe } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { Cafe, User } from '@/lib/supabase';
import QuickLogin from '@/components/QuickLogin';

interface CafePageProps {
  params: { cafeId: string };
}

export default function CafeLandingPage({ params }: CafePageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const action = searchParams.get('action'); // 'stamp' | 'order' | null

  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      setError(null);

      try {
        // 1. 카페 정보 조회 (short_code 또는 id로)
        let cafeData = await getCafeByShortCode(params.cafeId);
        if (!cafeData) {
          cafeData = await getCafe(params.cafeId);
        }

        if (!cafeData) {
          setError('카페를 찾을 수 없습니다.');
          return;
        }

        setCafe(cafeData);

        // 2. 현재 사용자 확인
        const currentUser = await getCurrentUser();
        setUser(currentUser);

        // 3. 로그인 상태 + action 파라미터가 있으면 해당 페이지로 이동
        if (currentUser && action === 'stamp') {
          router.push(`/c/${params.cafeId}/stamp`);
        }
      } catch (err) {
        setError('오류가 발생했습니다.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, [params.cafeId, action, router]);

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    // 로그인 성공 후 action에 따라 이동
    if (action === 'stamp') {
      router.push(`/c/${params.cafeId}/stamp`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cafe-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cafe-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error || !cafe) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cafe-50 p-4">
        <div className="card text-center max-w-md">
          <div className="text-5xl mb-4">☕</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            {error || '카페를 찾을 수 없습니다'}
          </h1>
          <p className="text-gray-600">
            카운터의 태그가 올바른지 확인해주세요.
          </p>
        </div>
      </div>
    );
  }

  // 비로그인 상태: 로그인 폼 표시
  if (!user) {
    return (
      <div className="min-h-screen bg-cafe-50 p-4 flex flex-col">
        {/* 카페 헤더 */}
        <div className="text-center py-8">
          {cafe.image_url ? (
            <img
              src={cafe.image_url}
              alt={cafe.name}
              className="w-24 h-24 rounded-full mx-auto mb-4 object-cover"
            />
          ) : (
            <div className="w-24 h-24 rounded-full mx-auto mb-4 bg-cafe-200 flex items-center justify-center">
              <span className="text-4xl">☕</span>
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-900">{cafe.name}</h1>
          {cafe.description && (
            <p className="text-gray-600 mt-1">{cafe.description}</p>
          )}
        </div>

        {/* 로그인 폼 */}
        <div className="flex-1 flex items-center justify-center">
          <QuickLogin cafeName={cafe.name} onSuccess={handleLoginSuccess} />
        </div>
      </div>
    );
  }

  // 로그인 상태: 액션 선택 화면
  return (
    <div className="min-h-screen bg-cafe-50 p-4">
      {/* 카페 헤더 */}
      <div className="text-center py-8">
        {cafe.image_url ? (
          <img
            src={cafe.image_url}
            alt={cafe.name}
            className="w-24 h-24 rounded-full mx-auto mb-4 object-cover"
          />
        ) : (
          <div className="w-24 h-24 rounded-full mx-auto mb-4 bg-cafe-200 flex items-center justify-center">
            <span className="text-4xl">☕</span>
          </div>
        )}
        <h1 className="text-2xl font-bold text-gray-900">{cafe.name}</h1>
        <p className="text-gray-600 mt-1">안녕하세요, {user.name}님!</p>
      </div>

      {/* 액션 버튼들 */}
      <div className="max-w-md mx-auto space-y-4">
        <button
          onClick={() => router.push(`/c/${params.cafeId}/stamp`)}
          className="card w-full p-6 text-left hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
              <span className="text-2xl">🎁</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">스탬프 적립</h3>
              <p className="text-sm text-gray-600">결제 후 스탬프를 적립하세요</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => router.push(`/c/${params.cafeId}/order`)}
          className="card w-full p-6 text-left hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-cafe-100 flex items-center justify-center">
              <span className="text-2xl">☕</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">주문하기</h3>
              <p className="text-sm text-gray-600">메뉴를 선택하고 주문하세요</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
