'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createCafe } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { loginWithKakao } from '@/lib/kakao';
import { User } from '@/lib/supabase';

export default function RegisterCafePage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 폼 상태
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [stampGoal, setStampGoal] = useState(10);

  useEffect(() => {
    async function init() {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setIsLoading(false);
    }
    init();
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const loggedInUser = await loginWithKakao();
      setUser(loggedInUser);
    } catch (err) {
      alert('로그인에 실패했습니다.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    if (!name.trim()) {
      alert('카페 이름을 입력해주세요.');
      return;
    }

    if (!address.trim()) {
      alert('주소를 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const cafe = await createCafe({
        ownerId: user.id,
        name: name.trim(),
        address: address.trim(),
        phone: phone.trim() || undefined,
        stampGoal,
      });

      alert('카페가 등록되었습니다!');
      router.push(`/merchant/${cafe.id}`);
    } catch (err) {
      alert('카페 등록에 실패했습니다.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
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
          <h1 className="text-xl font-bold text-gray-900 mb-2">카페 등록</h1>
          <p className="text-gray-600 mb-6">
            카페를 등록하려면 먼저 로그인해주세요
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
              onClick={() => router.back()}
              className="text-gray-600"
            >
              ← 뒤로
            </button>
            <h1 className="font-bold text-gray-900">카페 등록</h1>
            <div className="w-10" />
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6">
        {/* 안내 */}
        <div className="bg-blue-50 rounded-xl p-4 mb-6">
          <p className="text-sm text-blue-700">
            <strong>{user.name}</strong>님, 카페 정보를 입력하고 등록하세요.
            <br />
            등록 후 바로 스탬프 적립 서비스를 시작할 수 있습니다.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* 기본 정보 */}
          <div className="bg-white rounded-2xl p-6 shadow-sm mb-4">
            <h2 className="font-bold text-gray-900 mb-4">기본 정보</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  카페 이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 동네카페"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cafe-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  주소 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="예: 서울시 강남구 테헤란로 123"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cafe-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  전화번호
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="예: 02-1234-5678"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cafe-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* 스탬프 설정 */}
          <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
            <h2 className="font-bold text-gray-900 mb-4">스탬프 설정</h2>

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
                    {n}개 모으면 리워드
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-500 mt-2">
                고객이 {stampGoal}개의 스탬프를 모으면 무료 음료를 받을 수 있어요
              </p>
            </div>
          </div>

          {/* 등록 버튼 */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-cafe-500 text-white font-bold rounded-xl hover:bg-cafe-600 disabled:opacity-50"
          >
            {isSubmitting ? '등록 중...' : '카페 등록하기'}
          </button>
        </form>
      </main>
    </div>
  );
}
