'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCafe, getCafeByShortCode, autoRedeemStamp, getCafeStamp } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { Cafe, User, Stamp } from '@/lib/supabase';

type PageState = 'loading' | 'need_login' | 'checking' | 'no_active' | 'success' | 'error';

export default function NfcTapPage() {
  const params = useParams();
  const router = useRouter();
  const cafeIdOrCode = params.cafeId as string;

  const [state, setState] = useState<PageState>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [stamp, setStamp] = useState<Stamp | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ currentCount: number; goalCount: number; isReward: boolean } | null>(null);

  useEffect(() => {
    async function init() {
      try {
        // 1. 카페 정보 조회 (short_code 또는 id로)
        let cafeData = await getCafeByShortCode(cafeIdOrCode);
        if (!cafeData) {
          cafeData = await getCafe(cafeIdOrCode);
        }

        if (!cafeData) {
          setState('error');
          setError('카페를 찾을 수 없습니다.');
          return;
        }
        setCafe(cafeData);

        // 2. 로그인 상태 확인
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          setState('need_login');
          return;
        }
        setUser(currentUser);

        // 3. 현재 스탬프 조회
        const currentStamp = await getCafeStamp(currentUser.id, cafeData.id);
        setStamp(currentStamp);

        // 4. 자동 적립 시도
        setState('checking');
        try {
          const stampResult = await autoRedeemStamp({
            cafeId: cafeData.id,
            userId: currentUser.id,
          });

          setResult({
            currentCount: stampResult.currentCount,
            goalCount: stampResult.goalCount,
            isReward: stampResult.isRewardEarned,
          });
          setState('success');
        } catch (err: any) {
          // 활성 토큰이 없는 경우
          setState('no_active');
        }
      } catch (err) {
        setState('error');
        setError('데이터를 불러오는데 실패했습니다.');
      }
    }

    init();
  }, [cafeIdOrCode]);

  const handleLogin = () => {
    // 로그인 페이지로 이동 (현재 URL을 redirect 파라미터로)
    const currentUrl = window.location.href;
    router.push(`/login?redirect=${encodeURIComponent(currentUrl)}`);
  };

  const handleRetry = () => {
    setState('checking');
    if (user && cafe) {
      autoRedeemStamp({
        cafeId: cafe.id,
        userId: user.id,
      })
        .then((stampResult) => {
          setResult({
            currentCount: stampResult.currentCount,
            goalCount: stampResult.goalCount,
            isReward: stampResult.isRewardEarned,
          });
          setState('success');
        })
        .catch(() => {
          setState('no_active');
        });
    }
  };

  // 로딩
  if (state === 'loading' || state === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cafe-50">
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-cafe-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-700">
            {state === 'loading' ? '확인 중...' : '적립 중...'}
          </p>
        </div>
      </div>
    );
  }

  // 에러
  if (state === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">😢</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">오류 발생</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-cafe-500 text-white rounded-xl font-bold"
          >
            홈으로
          </button>
        </div>
      </div>
    );
  }

  // 로그인 필요
  if (state === 'need_login') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-cafe-50 p-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-6 text-center">
          {cafe?.image_url ? (
            <img
              src={cafe.image_url}
              alt={cafe.name}
              className="w-20 h-20 rounded-full object-cover mx-auto mb-4"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-cafe-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">☕</span>
            </div>
          )}

          <h1 className="text-xl font-bold text-gray-900 mb-2">{cafe?.name}</h1>
          <p className="text-gray-600 mb-6">스탬프 적립을 위해 로그인해주세요</p>

          <button
            onClick={handleLogin}
            className="w-full py-4 bg-cafe-500 text-white text-lg font-bold rounded-xl hover:bg-cafe-600 transition-colors"
          >
            로그인하고 적립받기
          </button>

          <p className="text-xs text-gray-400 mt-4">
            처음이신가요? 간편하게 가입할 수 있어요
          </p>
        </div>
      </div>
    );
  }

  // 활성 토큰 없음 (직원이 버튼 안 눌렀거나 만료됨)
  if (state === 'no_active') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-cafe-50 p-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-6 text-center">
          {cafe?.image_url ? (
            <img
              src={cafe.image_url}
              alt={cafe.name}
              className="w-16 h-16 rounded-full object-cover mx-auto mb-4"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-cafe-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">☕</span>
            </div>
          )}

          <h1 className="text-lg font-bold text-gray-900 mb-2">{cafe?.name}</h1>

          <div className="bg-amber-50 rounded-xl p-4 mb-6">
            <div className="text-4xl mb-2">🙋</div>
            <p className="text-amber-800 font-medium">
              직원에게 적립을 요청해주세요
            </p>
            <p className="text-sm text-amber-600 mt-1">
              직원이 적립 버튼을 누르면<br />자동으로 적립됩니다
            </p>
          </div>

          {/* 현재 스탬프 */}
          {stamp && (
            <div className="bg-gray-50 rounded-xl p-3 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">내 스탬프</span>
                <span className="font-bold text-cafe-500">
                  {stamp.count} / {cafe?.stamp_goal || 10}
                </span>
              </div>
              <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cafe-500 transition-all"
                  style={{ width: `${(stamp.count / (cafe?.stamp_goal || 10)) * 100}%` }}
                />
              </div>
            </div>
          )}

          <button
            onClick={handleRetry}
            className="w-full py-3 bg-cafe-500 text-white font-bold rounded-xl hover:bg-cafe-600 transition-colors"
          >
            다시 시도
          </button>

          <button
            onClick={() => router.push(`/c/${cafe?.short_code || cafeIdOrCode}`)}
            className="w-full py-3 text-gray-500 font-medium mt-2"
          >
            카페 정보 보기
          </button>
        </div>
      </div>
    );
  }

  // 적립 성공
  if (state === 'success' && result) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-cafe-50 p-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-6 text-center">
          {result.isReward ? (
            // 리워드 달성
            <>
              <div className="text-7xl mb-4 animate-bounce">🎉</div>
              <h1 className="text-2xl font-bold text-cafe-500 mb-2">
                축하합니다!
              </h1>
              <p className="text-gray-600 mb-4">
                스탬프 {result.goalCount}개를 모두 모았어요!<br />
                무료 음료 쿠폰이 발급되었습니다
              </p>
            </>
          ) : (
            // 일반 적립
            <>
              <div className="text-7xl mb-4">✅</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                적립 완료!
              </h1>
              <p className="text-gray-600 mb-4">
                1 스탬프가 적립되었습니다
              </p>
            </>
          )}

          {/* 스탬프 현황 */}
          <div className="bg-cafe-50 rounded-xl p-4 mb-6">
            <div className="text-4xl font-bold text-cafe-500 mb-2">
              {result.currentCount} / {result.goalCount}
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-cafe-500 transition-all"
                style={{ width: `${(result.currentCount / result.goalCount) * 100}%` }}
              />
            </div>
            {!result.isReward && result.goalCount - result.currentCount > 0 && (
              <p className="text-sm text-gray-500 mt-2">
                {result.goalCount - result.currentCount}개 더 모으면 무료 음료!
              </p>
            )}
          </div>

          <button
            onClick={() => router.push(`/c/${cafe?.short_code || cafeIdOrCode}`)}
            className="w-full py-4 bg-cafe-500 text-white text-lg font-bold rounded-xl hover:bg-cafe-600 transition-colors"
          >
            확인
          </button>
        </div>
      </div>
    );
  }

  return null;
}
