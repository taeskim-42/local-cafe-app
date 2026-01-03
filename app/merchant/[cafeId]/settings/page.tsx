'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCafe, updateCafe } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { loginWithKakao } from '@/lib/kakao';
import { Cafe, User } from '@/lib/supabase';

export default function CafeSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const cafeId = params.cafeId as string;

  const [user, setUser] = useState<User | null>(null);
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 폼 상태
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [stampGoal, setStampGoal] = useState(10);

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
    setName(cafeData.name);
    setAddress(cafeData.address || '');
    setStampGoal(cafeData.stamp_goal);
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

  const handleSave = async () => {
    if (!cafe) return;

    setIsSaving(true);
    setSuccessMessage(null);

    try {
      await updateCafe(cafe.id, {
        name,
        address,
        stamp_goal: stampGoal,
      });
      setSuccessMessage('저장되었습니다!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      alert('저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-cafe-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (needsLogin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-6">👨‍💼</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">사장님 전용</h1>
          <p className="text-gray-600 mb-6">
            카페 설정을 위해 로그인이 필요합니다
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
            <button
              onClick={() => router.back()}
              className="text-gray-600"
            >
              ← 뒤로
            </button>
            <h1 className="font-bold text-gray-900">카페 설정</h1>
            <div className="w-10" />
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6">
        {/* 성공 메시지 */}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-100 text-green-700 rounded-xl text-center">
            {successMessage}
          </div>
        )}

        {/* 기본 정보 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-4">
          <h2 className="font-bold text-gray-900 mb-4">기본 정보</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                카페 이름
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cafe-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                주소
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cafe-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* 스탬프 설정 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-4">
          <h2 className="font-bold text-gray-900 mb-4">스탬프 설정</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                스탬프 목표 개수
              </label>
              <select
                value={stampGoal}
                onChange={(e) => setStampGoal(Number(e.target.value))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cafe-500 focus:border-transparent"
              >
                {[5, 8, 10, 12, 15, 20].map((n) => (
                  <option key={n} value={n}>
                    {n}개
                  </option>
                ))}
              </select>
            </div>

          </div>
        </div>

        {/* 링크 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <h2 className="font-bold text-gray-900 mb-4">바로가기</h2>

          <div className="space-y-3">
            <button
              onClick={() => router.push(`/merchant/${cafeId}/orders`)}
              className="w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-xl text-left flex justify-between items-center"
            >
              <span>주문 관리</span>
              <span>→</span>
            </button>
            <button
              onClick={() => router.push(`/merchant/${cafeId}`)}
              className="w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-xl text-left flex justify-between items-center"
            >
              <span>스탬프 적립</span>
              <span>→</span>
            </button>
          </div>
        </div>

        {/* 저장 버튼 */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full py-4 bg-cafe-500 text-white font-bold rounded-xl hover:bg-cafe-600 disabled:opacity-50"
        >
          {isSaving ? '저장 중...' : '저장하기'}
        </button>
      </main>
    </div>
  );
}
