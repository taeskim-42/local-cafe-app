'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getOwnerCafes } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { loginWithKakao } from '@/lib/kakao';
import { Cafe, User } from '@/lib/supabase';

export default function MyCafesPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    async function init() {
      const currentUser = await getCurrentUser();
      setUser(currentUser);

      if (currentUser) {
        const myCafes = await getOwnerCafes(currentUser.id);
        setCafes(myCafes);
      }

      setIsLoading(false);
    }
    init();
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const loggedInUser = await loginWithKakao();
      setUser(loggedInUser);
      const myCafes = await getOwnerCafes(loggedInUser.id);
      setCafes(myCafes);
    } catch (err) {
      alert('로그인에 실패했습니다.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-cafe-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // 로그인 필요
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-6">☕</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">내 카페</h1>
          <p className="text-gray-600 mb-6">
            로그인하여 등록한 카페를 관리하세요
          </p>
          <button
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="w-full py-4 bg-yellow-400 text-yellow-900 font-bold rounded-xl hover:bg-yellow-500 disabled:opacity-50"
          >
            {isLoggingIn ? '로그인 중...' : '카카오로 로그인'}
          </button>
          <button
            onClick={() => router.push('/')}
            className="mt-4 text-gray-500 text-sm"
          >
            홈으로 돌아가기
          </button>
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
              onClick={() => router.push('/')}
              className="text-gray-600"
            >
              ← 홈
            </button>
            <h1 className="font-bold text-gray-900">내 카페</h1>
            <button
              onClick={() => router.push('/register-cafe')}
              className="px-3 py-1 text-sm bg-cafe-500 text-white rounded-lg"
            >
              + 등록
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6">
        {/* 안내 */}
        <div className="bg-blue-50 rounded-xl p-4 mb-6">
          <p className="text-sm text-blue-700">
            <strong>{user.name}</strong>님이 등록한 카페 목록입니다
          </p>
        </div>

        {cafes.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">☕</div>
            <p className="text-gray-600 mb-4">등록된 카페가 없습니다</p>
            <button
              onClick={() => router.push('/register-cafe')}
              className="px-6 py-3 bg-cafe-500 text-white font-bold rounded-xl"
            >
              첫 카페 등록하기
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {cafes.map((cafe) => (
              <div
                key={cafe.id}
                className="bg-white rounded-2xl p-4 shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-cafe-100 flex items-center justify-center">
                    <span className="text-2xl">☕</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900">{cafe.name}</h3>
                    <p className="text-sm text-gray-500">{cafe.address}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      코드: {cafe.short_code}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => router.push(`/merchant/${cafe.id}`)}
                    className="flex-1 py-2 bg-cafe-500 text-white text-sm font-medium rounded-lg"
                  >
                    스탬프 적립
                  </button>
                  <button
                    onClick={() => router.push(`/merchant/${cafe.id}/orders`)}
                    className="flex-1 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg"
                  >
                    주문 관리
                  </button>
                  <button
                    onClick={() => router.push(`/merchant/${cafe.id}/settings`)}
                    className="flex-1 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg"
                  >
                    설정
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
