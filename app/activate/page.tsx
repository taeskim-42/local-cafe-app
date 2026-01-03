'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { verifyRegistrationCode, useRegistrationCode, createCafeForOwner } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { loginWithKakao } from '@/lib/kakao';
import { User } from '@/lib/supabase';

type Step = 'code' | 'login' | 'info' | 'done';

export default function ActivatePage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>('code');
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 코드 입력
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);

  // 카페 정보
  const [cafeName, setCafeName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [stampGoal, setStampGoal] = useState(10);

  // 생성된 카페
  const [createdCafeId, setCreatedCafeId] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setIsLoading(false);
    }
    init();
  }, []);

  const handleVerifyCode = async () => {
    if (!code.trim()) {
      setCodeError('등록 코드를 입력해주세요.');
      return;
    }

    setCodeError(null);
    setIsSubmitting(true);

    try {
      const validCode = await verifyRegistrationCode(code.trim());
      if (!validCode) {
        setCodeError('유효하지 않거나 이미 사용된 코드입니다.');
        return;
      }

      // 코드 유효 → 다음 단계
      if (user) {
        setStep('info');
      } else {
        setStep('login');
      }
    } catch (err) {
      setCodeError('코드 확인 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const loggedInUser = await loginWithKakao();
      setUser(loggedInUser);
      setStep('info');
    } catch (err) {
      alert('로그인에 실패했습니다.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleCreateCafe = async () => {
    if (!user) return;

    if (!cafeName.trim()) {
      alert('카페 이름을 입력해주세요.');
      return;
    }

    if (!address.trim()) {
      alert('주소를 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. 코드 사용 처리
      await useRegistrationCode(code.trim(), user.id);

      // 2. 카페 생성
      const cafe = await createCafeForOwner({
        ownerId: user.id,
        name: cafeName.trim(),
        address: address.trim(),
        phone: phone.trim() || undefined,
        stampGoal,
      });

      setCreatedCafeId(cafe.id);
      setStep('done');
    } catch (err: any) {
      alert(err.message || '카페 생성에 실패했습니다.');
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-md mx-auto px-4 py-4">
          <h1 className="font-bold text-gray-900 text-center">카페 등록</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-8">
        {/* Step 1: 코드 입력 */}
        {step === 'code' && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="text-center mb-6">
              <div className="text-5xl mb-4">🎫</div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">등록 코드 입력</h2>
              <p className="text-gray-600 text-sm">
                관리자에게 받은 등록 코드를 입력해주세요
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="예: CAFE-A3X9K2"
                  className="w-full px-4 py-4 text-center text-xl font-mono border border-gray-300 rounded-xl focus:ring-2 focus:ring-cafe-500 focus:border-transparent uppercase"
                />
                {codeError && (
                  <p className="text-red-500 text-sm mt-2 text-center">{codeError}</p>
                )}
              </div>

              <button
                onClick={handleVerifyCode}
                disabled={isSubmitting}
                className="w-full py-4 bg-cafe-500 text-white font-bold rounded-xl hover:bg-cafe-600 disabled:opacity-50"
              >
                {isSubmitting ? '확인 중...' : '다음'}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: 로그인 */}
        {step === 'login' && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="text-center mb-6">
              <div className="text-5xl mb-4">👤</div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">카카오 로그인</h2>
              <p className="text-gray-600 text-sm">
                카페 관리를 위해 카카오 로그인이 필요합니다
              </p>
            </div>

            <button
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="w-full py-4 bg-yellow-400 text-yellow-900 font-bold rounded-xl hover:bg-yellow-500 disabled:opacity-50"
            >
              {isLoggingIn ? '로그인 중...' : '카카오로 로그인'}
            </button>
          </div>
        )}

        {/* Step 3: 카페 정보 입력 */}
        {step === 'info' && (
          <div className="space-y-4">
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <p className="text-green-700 font-medium">
                코드 확인 완료! 카페 정보를 입력해주세요
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="font-bold text-gray-900 mb-4">카페 정보</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    카페 이름 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={cafeName}
                    onChange={(e) => setCafeName(e.target.value)}
                    placeholder="예: 동네카페"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cafe-500 focus:border-transparent"
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    스탬프 목표
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
                </div>
              </div>
            </div>

            <button
              onClick={handleCreateCafe}
              disabled={isSubmitting}
              className="w-full py-4 bg-cafe-500 text-white font-bold rounded-xl hover:bg-cafe-600 disabled:opacity-50"
            >
              {isSubmitting ? '등록 중...' : '카페 등록 완료'}
            </button>
          </div>
        )}

        {/* Step 4: 완료 */}
        {step === 'done' && (
          <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">등록 완료!</h2>
            <p className="text-gray-600 mb-6">
              카페가 성공적으로 등록되었습니다.<br />
              이제 메뉴를 등록하고 운영을 시작하세요!
            </p>

            <div className="space-y-3">
              <button
                onClick={() => router.push(`/merchant/${createdCafeId}/menus`)}
                className="w-full py-4 bg-cafe-500 text-white font-bold rounded-xl"
              >
                메뉴 등록하기
              </button>
              <button
                onClick={() => router.push(`/merchant/${createdCafeId}/settings`)}
                className="w-full py-3 bg-gray-100 text-gray-700 font-medium rounded-xl"
              >
                카페 설정
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
