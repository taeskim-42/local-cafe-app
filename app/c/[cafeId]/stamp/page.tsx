'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCafeByShortCode, getCafe, getCafeStamp, addStamp, StampResult } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { Cafe, User, Stamp } from '@/lib/supabase';
import QuickLogin from '@/components/QuickLogin';

interface StampPageProps {
  params: { cafeId: string };
}

type StampState = 'idle' | 'stamping' | 'success' | 'reward' | 'error';

export default function StampPage({ params }: StampPageProps) {
  const router = useRouter();

  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [stamp, setStamp] = useState<Stamp | null>(null);
  const [stampState, setStampState] = useState<StampState>('idle');
  const [stampResult, setStampResult] = useState<StampResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function init() {
      setIsLoading(true);

      try {
        // 1. 카페 정보 조회
        let cafeData = await getCafeByShortCode(params.cafeId);
        if (!cafeData) {
          cafeData = await getCafe(params.cafeId);
        }

        if (!cafeData) {
          setErrorMessage('카페를 찾을 수 없습니다.');
          return;
        }

        setCafe(cafeData);

        // 2. 현재 사용자 확인
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          setIsLoading(false);
          return;
        }

        setUser(currentUser);

        // 3. 현재 스탬프 조회
        const currentStamp = await getCafeStamp(currentUser.id, cafeData.id);
        setStamp(currentStamp);
      } catch (err) {
        console.error(err);
        setErrorMessage('오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, [params.cafeId]);

  const handleLoginSuccess = async (loggedInUser: User) => {
    setUser(loggedInUser);

    if (cafe) {
      const currentStamp = await getCafeStamp(loggedInUser.id, cafe.id);
      setStamp(currentStamp);
    }
  };

  const handleStamp = async () => {
    if (!user || !cafe) return;

    setStampState('stamping');
    setErrorMessage(null);

    try {
      const result = await addStamp({
        userId: user.id,
        cafeId: cafe.id,
        source: 'customer_scan',
      });

      setStampResult(result);
      setStamp(result.stamp);

      if (result.isRewardEarned) {
        setStampState('reward');
      } else {
        setStampState('success');
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '적립에 실패했습니다.');
      setStampState('error');
    }
  };

  const handleReset = () => {
    setStampState('idle');
    setStampResult(null);
    setErrorMessage(null);
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

  if (!cafe) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cafe-50 p-4">
        <div className="card text-center max-w-md">
          <div className="text-5xl mb-4">☕</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            {errorMessage || '카페를 찾을 수 없습니다'}
          </h1>
        </div>
      </div>
    );
  }

  // 비로그인 상태
  if (!user) {
    return (
      <div className="min-h-screen bg-cafe-50 p-4 flex flex-col">
        <div className="text-center py-8">
          <h1 className="text-2xl font-bold text-gray-900">{cafe.name}</h1>
          <p className="text-gray-600 mt-1">스탬프 적립</p>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <QuickLogin cafeName={cafe.name} onSuccess={handleLoginSuccess} />
        </div>
      </div>
    );
  }

  const currentCount = stamp?.count ?? 0;
  const goalCount = cafe.stamp_goal;

  return (
    <div className="min-h-screen bg-cafe-50 p-4 flex flex-col">
      {/* 헤더 */}
      <div className="text-center py-6">
        <h1 className="text-xl font-bold text-gray-900">{cafe.name}</h1>
        <p className="text-gray-600">스탬프 적립</p>
      </div>

      {/* 스탬프 진행 상황 */}
      <div className="card max-w-md mx-auto w-full mb-6">
        <div className="text-center mb-4">
          <p className="text-sm text-gray-600 mb-1">{user.name}님의 스탬프</p>
          <p className="text-3xl font-bold text-cafe-500">
            {stampResult?.currentCount ?? currentCount}
            <span className="text-lg text-gray-400 font-normal">/{goalCount}</span>
          </p>
        </div>

        {/* 스탬프 아이콘 그리드 */}
        <div className="grid grid-cols-5 gap-2 mb-4">
          {Array.from({ length: goalCount }).map((_, i) => {
            const isFilled = i < (stampResult?.currentCount ?? currentCount);
            const isNew = stampResult && i === stampResult.currentCount - 1 && stampState === 'success';

            return (
              <div
                key={i}
                className={`
                  aspect-square rounded-full flex items-center justify-center text-xl
                  transition-all duration-300
                  ${isFilled ? 'bg-amber-400' : 'bg-gray-200'}
                  ${isNew ? 'scale-125 animate-bounce' : ''}
                `}
              >
                {isFilled ? '☕' : '○'}
              </div>
            );
          })}
        </div>

        <p className="text-center text-sm text-gray-500">
          {goalCount - (stampResult?.currentCount ?? currentCount)}개 더 모으면 무료 음료!
        </p>
      </div>

      {/* 적립 버튼 / 결과 */}
      <div className="max-w-md mx-auto w-full flex-1 flex flex-col justify-center">
        {stampState === 'idle' && (
          <button onClick={handleStamp} className="btn-primary py-5 text-lg">
            스탬프 적립하기
          </button>
        )}

        {stampState === 'stamping' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 border-4 border-cafe-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">적립 중...</p>
          </div>
        )}

        {stampState === 'success' && (
          <div className="card text-center py-8">
            <div className="text-6xl mb-4 animate-bounce">🎉</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">적립 완료!</h2>
            <p className="text-gray-600 mb-6">
              스탬프 1개가 적립되었습니다.
            </p>
            <button onClick={handleReset} className="btn-secondary">
              확인
            </button>
          </div>
        )}

        {stampState === 'reward' && (
          <div className="card text-center py-8 bg-gradient-to-b from-amber-50 to-white">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-2xl font-bold text-amber-600 mb-2">
              축하합니다!
            </h2>
            <p className="text-gray-700 mb-2">
              스탬프 {goalCount}개를 모두 모았어요!
            </p>
            <p className="text-lg font-bold text-cafe-500 mb-6">
              무료 음료 쿠폰이 발급되었습니다 🎁
            </p>
            <button onClick={handleReset} className="btn-primary">
              확인
            </button>
          </div>
        )}

        {stampState === 'error' && (
          <div className="card text-center py-8">
            <div className="text-5xl mb-4">😅</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">적립 실패</h2>
            <p className="text-red-500 mb-6">{errorMessage}</p>
            <button onClick={handleReset} className="btn-secondary">
              다시 시도
            </button>
          </div>
        )}
      </div>

      {/* 하단 네비게이션 */}
      <div className="max-w-md mx-auto w-full pt-4">
        <button
          onClick={() => router.push(`/c/${params.cafeId}`)}
          className="w-full py-3 text-center text-gray-500 text-sm"
        >
          ← 카페 홈으로
        </button>
      </div>
    </div>
  );
}
