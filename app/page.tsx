'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCafes, getUserStamps } from '@/lib/api';
import { getCurrentUser, signOut } from '@/lib/auth';
import { Cafe, User, Stamp } from '@/lib/supabase';

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [stamps, setStamps] = useState<Stamp[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function init() {
      setIsLoading(true);

      try {
        // 카페 목록 조회
        const cafeList = await getCafes();
        setCafes(cafeList);

        // 로그인 상태 확인
        const currentUser = await getCurrentUser();
        setUser(currentUser);

        if (currentUser) {
          // 내 스탬프 목록 조회
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

  const handleLogout = async () => {
    await signOut();
    setUser(null);
    setStamps([]);
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

  return (
    <div className="min-h-screen bg-cafe-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-cafe-500">동네카페</h1>
          {user ? (
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500"
            >
              로그아웃
            </button>
          ) : (
            <span className="text-sm text-gray-500">비로그인</span>
          )}
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* 사용자 인사 */}
        {user && (
          <div className="card">
            <p className="text-gray-600">
              안녕하세요, <span className="font-bold text-gray-900">{user.name}</span>님!
            </p>
          </div>
        )}

        {/* 내 스탬프 현황 */}
        {user && stamps.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">내 스탬프</h2>
            <div className="space-y-3">
              {stamps.map((stamp) => (
                <div
                  key={stamp.id}
                  className="card cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => router.push(`/c/${stamp.cafe?.short_code || stamp.cafe_id}`)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-cafe-100 flex items-center justify-center">
                      <span className="text-xl">☕</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">
                        {stamp.cafe?.name || '카페'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        스탬프 {stamp.count}/{stamp.cafe?.stamp_goal || 10}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-cafe-500">
                        {stamp.count}
                      </div>
                    </div>
                  </div>

                  {/* 프로그레스 바 */}
                  <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 transition-all"
                      style={{
                        width: `${Math.min(100, (stamp.count / (stamp.cafe?.stamp_goal || 10)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 카페 목록 */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">근처 카페</h2>
          {cafes.length === 0 ? (
            <div className="card text-center py-8">
              <div className="text-4xl mb-2">☕</div>
              <p className="text-gray-600">등록된 카페가 없습니다</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cafes.map((cafe) => (
                <div
                  key={cafe.id}
                  className="card cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => router.push(`/c/${cafe.short_code || cafe.id}`)}
                >
                  <div className="flex items-center gap-4">
                    {cafe.image_url ? (
                      <img
                        src={cafe.image_url}
                        alt={cafe.name}
                        className="w-16 h-16 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-cafe-100 flex items-center justify-center">
                        <span className="text-2xl">☕</span>
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">{cafe.name}</h3>
                      <p className="text-sm text-gray-600 line-clamp-1">
                        {cafe.address}
                      </p>
                      <p className="text-xs text-cafe-500 mt-1">
                        스탬프 {cafe.stamp_goal}개 적립 시 무료 음료
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 적립 안내 */}
        <section className="card bg-gradient-to-br from-cafe-50 to-white border border-cafe-200">
          <div className="text-center py-4">
            <div className="text-4xl mb-3">📱</div>
            <h3 className="font-bold text-gray-900 mb-2">
              카운터에서 휴대폰을 대세요
            </h3>
            <p className="text-sm text-gray-600">
              결제 후 카운터의 태그에 폰을 대면<br />
              스탬프가 자동으로 적립돼요
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
