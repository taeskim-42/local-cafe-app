'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAdmin, createRegistrationCode, getAllRegistrationCodes } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { loginWithKakao } from '@/lib/kakao';
import { User, RegistrationCode, Cafe } from '@/lib/supabase';

type CodeWithDetails = RegistrationCode & { cafe?: Cafe; user?: User };

export default function AdminPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [codes, setCodes] = useState<CodeWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    async function init() {
      const currentUser = await getCurrentUser();
      setUser(currentUser);

      if (currentUser) {
        const adminCheck = await isAdmin(currentUser.id);
        setIsAdminUser(adminCheck);

        if (adminCheck) {
          const codeList = await getAllRegistrationCodes();
          setCodes(codeList);
        }
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

      const adminCheck = await isAdmin(loggedInUser.id);
      setIsAdminUser(adminCheck);

      if (adminCheck) {
        const codeList = await getAllRegistrationCodes();
        setCodes(codeList);
      }
    } catch (err) {
      alert('로그인에 실패했습니다.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleCreateCode = async () => {
    setIsCreating(true);
    try {
      const newCode = await createRegistrationCode();
      setCodes((prev) => [newCode, ...prev]);
    } catch (err) {
      alert('코드 생성에 실패했습니다.');
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('복사되었습니다!');
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
          <div className="text-6xl mb-6">🔐</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Admin</h1>
          <p className="text-gray-600 mb-6">관리자 로그인이 필요합니다</p>
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

  // Admin 권한 없음
  if (!isAdminUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-6">🚫</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">접근 불가</h1>
          <p className="text-gray-600 mb-4">관리자 권한이 없습니다</p>
          <p className="text-sm text-gray-400">로그인: {user.name}</p>
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
              <h1 className="text-lg font-bold text-gray-900">Admin</h1>
              <p className="text-sm text-gray-500">{user.name}</p>
            </div>
            <button
              onClick={handleCreateCode}
              disabled={isCreating}
              className="px-4 py-2 bg-cafe-500 text-white font-bold rounded-lg disabled:opacity-50"
            >
              {isCreating ? '생성 중...' : '+ 코드 생성'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* 통계 */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <p className="text-3xl font-bold text-cafe-500">{codes.length}</p>
            <p className="text-sm text-gray-500">총 발급</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <p className="text-3xl font-bold text-green-500">
              {codes.filter((c) => c.used_by).length}
            </p>
            <p className="text-sm text-gray-500">사용됨</p>
          </div>
        </div>

        {/* 코드 목록 */}
        <h2 className="font-bold text-gray-900 mb-3">등록 코드 목록</h2>

        {codes.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <div className="text-4xl mb-4">📝</div>
            <p className="text-gray-600">발급된 코드가 없습니다</p>
          </div>
        ) : (
          <div className="space-y-3">
            {codes.map((code) => (
              <div
                key={code.id}
                className={`bg-white rounded-xl p-4 shadow-sm ${
                  code.used_by ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <code className="text-lg font-mono font-bold text-cafe-600">
                    {code.code}
                  </code>
                  {code.used_by ? (
                    <span className="px-2 py-1 bg-green-100 text-green-600 text-xs rounded-full">
                      사용됨
                    </span>
                  ) : (
                    <button
                      onClick={() => copyToClipboard(code.code)}
                      className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg"
                    >
                      복사
                    </button>
                  )}
                </div>

                <div className="text-xs text-gray-500">
                  <p>생성: {new Date(code.created_at).toLocaleDateString('ko-KR')}</p>
                  {code.used_by && code.user && (
                    <>
                      <p>점주: {code.user.name}</p>
                      {code.cafe && <p>카페: {code.cafe.name}</p>}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
