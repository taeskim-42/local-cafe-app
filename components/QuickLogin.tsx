'use client';

import { useState, useEffect } from 'react';
import { initKakao, loginWithKakao } from '@/lib/kakao';
import { User } from '@/lib/supabase';

interface QuickLoginProps {
  cafeName?: string;
  onSuccess: (user: User) => void;
}

export default function QuickLogin({ cafeName, onSuccess }: QuickLoginProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSdkReady, setIsSdkReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 컴포넌트 마운트 시 SDK 초기화
  useEffect(() => {
    initKakao()
      .then(() => setIsSdkReady(true))
      .catch((err) => {
        console.error('SDK init error:', err);
        // SDK 실패해도 버튼은 활성화 (클릭 시 재시도)
        setIsSdkReady(true);
      });
  }, []);

  const handleKakaoLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const user = await loginWithKakao();
      onSuccess(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-2xl shadow-lg max-w-md mx-auto">
      <h2 className="text-xl font-bold text-gray-900 mb-2">
        {cafeName ? `${cafeName}` : '동네카페'}
      </h2>
      <p className="text-gray-600 mb-6">
        스탬프 적립을 위해 로그인해주세요
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      )}

      <button
        onClick={handleKakaoLogin}
        disabled={isLoading || !isSdkReady}
        className="w-full py-4 bg-[#FEE500] text-[#000000D9] font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-[#FDD835] transition-colors disabled:opacity-50"
      >
        {!isSdkReady ? (
          '준비 중...'
        ) : isLoading ? (
          '로그인 중...'
        ) : (
          <>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 4C7.58172 4 4 6.90294 4 10.4444C4 12.6827 5.51832 14.6476 7.79632 15.8068L6.87712 19.1691C6.80432 19.4367 7.10432 19.6487 7.33632 19.4847L11.2675 16.7733C11.5067 16.7911 11.7507 16.8 12 16.8C16.4183 16.8 20 13.8971 20 10.3556C20 6.81396 16.4183 4 12 4Z"
                fill="#000000D9"
              />
            </svg>
            카카오로 시작하기
          </>
        )}
      </button>

      <p className="mt-4 text-xs text-gray-400 text-center">
        로그인 시 서비스 이용약관에 동의하는 것으로 간주됩니다
      </p>
    </div>
  );
}
