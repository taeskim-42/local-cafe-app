'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, User, Cafe } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { loginWithKakao } from '@/lib/kakao';

type TestRole = 'customer' | 'owner' | 'admin';

export default function TestPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedCafeId, setSelectedCafeId] = useState<string>('');

  useEffect(() => {
    async function init() {
      const currentUser = await getCurrentUser();
      setUser(currentUser);

      // 모든 카페 목록 조회
      const { data: cafeList } = await supabase
        .from('cafes')
        .select('*')
        .order('created_at', { ascending: false });

      setCafes(cafeList || []);
      setIsLoading(false);
    }
    init();
  }, []);

  const handleLogin = async () => {
    try {
      const loggedInUser = await loginWithKakao();
      setUser(loggedInUser);
    } catch (err) {
      alert('로그인 실패');
    }
  };

  const handleRoleChange = async (role: TestRole) => {
    if (!user) return;
    setIsUpdating(true);

    try {
      const updates: any = {
        role,
        is_admin: role === 'admin',
      };

      await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id);

      setUser({ ...user, role, is_admin: role === 'admin' } as any);
      alert(`역할이 "${role}"로 변경되었습니다.`);
    } catch (err) {
      alert('역할 변경 실패');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSetOwner = async (cafeId: string) => {
    if (!user || !cafeId) return;
    setIsUpdating(true);

    try {
      // 해당 카페의 owner_id를 현재 유저로 설정
      await supabase
        .from('cafes')
        .update({ owner_id: user.id })
        .eq('id', cafeId);

      // 역할도 owner로 변경
      await supabase
        .from('users')
        .update({ role: 'owner' })
        .eq('id', user.id);

      setUser({ ...user, role: 'owner' } as any);
      alert('카페 소유자로 설정되었습니다!');

      // 카페 목록 새로고침
      const { data: cafeList } = await supabase
        .from('cafes')
        .select('*')
        .order('created_at', { ascending: false });
      setCafes(cafeList || []);
    } catch (err) {
      alert('설정 실패');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">
          🧪 테스트 모드
        </h1>

        {/* 로그인 상태 */}
        <div className="bg-white rounded-xl p-4 shadow mb-4">
          <h2 className="font-bold text-gray-700 mb-3">현재 로그인</h2>
          {user ? (
            <div className="space-y-2">
              <p><strong>이름:</strong> {user.name}</p>
              <p><strong>ID:</strong> <code className="text-xs bg-gray-100 p-1">{user.id}</code></p>
              <p><strong>역할:</strong> <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">{user.role}</span></p>
              <p><strong>Admin:</strong> {(user as any).is_admin ? '✅' : '❌'}</p>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              className="w-full py-3 bg-yellow-400 text-yellow-900 font-bold rounded-lg"
            >
              카카오로 로그인
            </button>
          )}
        </div>

        {user && (
          <>
            {/* 역할 변경 */}
            <div className="bg-white rounded-xl p-4 shadow mb-4">
              <h2 className="font-bold text-gray-700 mb-3">역할 변경</h2>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleRoleChange('customer')}
                  disabled={isUpdating}
                  className={`py-2 rounded-lg font-medium ${
                    user.role === 'customer'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  고객
                </button>
                <button
                  onClick={() => handleRoleChange('owner')}
                  disabled={isUpdating}
                  className={`py-2 rounded-lg font-medium ${
                    user.role === 'owner'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  점주
                </button>
                <button
                  onClick={() => handleRoleChange('admin')}
                  disabled={isUpdating}
                  className={`py-2 rounded-lg font-medium ${
                    (user as any).is_admin
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  Admin
                </button>
              </div>
            </div>

            {/* 카페 소유자 설정 */}
            <div className="bg-white rounded-xl p-4 shadow mb-4">
              <h2 className="font-bold text-gray-700 mb-3">카페 소유자로 설정</h2>
              <select
                value={selectedCafeId}
                onChange={(e) => setSelectedCafeId(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg mb-2"
              >
                <option value="">카페 선택...</option>
                {cafes.map((cafe) => (
                  <option key={cafe.id} value={cafe.id}>
                    {cafe.name} {cafe.owner_id === user.id ? '(내 카페)' : ''}
                  </option>
                ))}
              </select>
              <button
                onClick={() => handleSetOwner(selectedCafeId)}
                disabled={isUpdating || !selectedCafeId}
                className="w-full py-2 bg-green-500 text-white font-bold rounded-lg disabled:opacity-50"
              >
                이 카페의 소유자로 설정
              </button>
            </div>

            {/* 바로가기 */}
            <div className="bg-white rounded-xl p-4 shadow">
              <h2 className="font-bold text-gray-700 mb-3">바로가기</h2>
              <div className="space-y-2">
                <button
                  onClick={() => router.push('/')}
                  className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg"
                >
                  🏠 홈
                </button>
                <button
                  onClick={() => router.push('/admin')}
                  className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg"
                >
                  🔐 Admin
                </button>
                <button
                  onClick={() => router.push('/my-cafes')}
                  className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg"
                >
                  ☕ 내 카페
                </button>
                <button
                  onClick={() => router.push('/activate')}
                  className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg"
                >
                  🎫 코드 등록
                </button>
                {cafes.length > 0 && (
                  <>
                    <hr className="my-2" />
                    <p className="text-sm text-gray-500">카페 페이지:</p>
                    {cafes.slice(0, 3).map((cafe) => (
                      <button
                        key={cafe.id}
                        onClick={() => router.push(`/c/${cafe.id}`)}
                        className="w-full py-2 bg-amber-100 text-amber-800 rounded-lg text-sm"
                      >
                        {cafe.name} (고객용)
                      </button>
                    ))}
                    {cafes.slice(0, 3).map((cafe) => (
                      <button
                        key={`m-${cafe.id}`}
                        onClick={() => router.push(`/merchant/${cafe.id}`)}
                        className="w-full py-2 bg-blue-100 text-blue-800 rounded-lg text-sm"
                      >
                        {cafe.name} (점주용)
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
