'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, signOut } from '@/lib/auth';
import { getUserStamps } from '@/lib/api';
import { User, Stamp } from '@/lib/supabase';
import { loginWithKakao } from '@/lib/kakao';

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [stamps, setStamps] = useState<Stamp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);

        if (currentUser) {
          const myStamps = await getUserStamps(currentUser.id);
          setStamps(myStamps);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const loggedInUser = await loginWithKakao();
      setUser(loggedInUser);
      const myStamps = await getUserStamps(loggedInUser.id);
      setStamps(myStamps);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    setUser(null);
    setStamps([]);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-orange-50">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      {/* 헤더 */}
      <header className="pt-8 pb-4 px-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div />
          {user ? (
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              로그아웃
            </button>
          ) : (
            <button
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="px-4 py-2 bg-yellow-400 text-yellow-900 text-sm font-bold rounded-lg hover:bg-yellow-500 disabled:opacity-50"
            >
              {isLoggingIn ? '로그인 중...' : '로그인'}
            </button>
          )}
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-8">
        {/* 메인 안내 */}
        <div className="text-center mb-12">
          <div className="text-7xl mb-6">☕</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            카페에서 시작하세요
          </h1>
          <p className="text-gray-600 leading-relaxed">
            카운터의 태그에 휴대폰을 대면<br />
            주문과 스탬프 적립을 할 수 있어요
          </p>
        </div>

        {/* 로그인한 경우: 내 스탬프 표시 */}
        {user && stamps.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-bold text-gray-500 mb-3 text-center">
              {user.name}님의 스탬프
            </h2>
            <div className="space-y-3">
              {stamps.map((stamp) => (
                <div
                  key={stamp.id}
                  className="bg-white rounded-2xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => router.push(`/c/${stamp.cafe?.short_code || stamp.cafe_id}`)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                      <span className="text-xl">☕</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">
                        {stamp.cafe?.name || '카페'}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-400"
                            style={{
                              width: `${Math.min(100, (stamp.count / (stamp.cafe?.stamp_goal || 10)) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-bold text-amber-600">
                          {stamp.count}/{stamp.cafe?.stamp_goal || 10}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 사용 방법 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-4 text-center">이용 방법</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-amber-600">1</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">카페 방문</p>
                <p className="text-sm text-gray-500">카운터에서 주문하세요</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-amber-600">2</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">태그에 폰을 대세요</p>
                <p className="text-sm text-gray-500">카운터의 태그에 휴대폰을 터치</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-amber-600">3</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">자동 적립</p>
                <p className="text-sm text-gray-500">스탬프가 바로 적립됩니다</p>
              </div>
            </div>
          </div>
        </div>

        {/* 로그인 유도 (비로그인 시) */}
        {!user && (
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 mb-3">
              로그인하면 스탬프를 관리할 수 있어요
            </p>
            <button
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="px-8 py-3 bg-yellow-400 text-yellow-900 font-bold rounded-xl hover:bg-yellow-500 disabled:opacity-50"
            >
              카카오로 시작하기
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
