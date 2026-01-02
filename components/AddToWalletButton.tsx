'use client';

import { useState } from 'react';

interface AddToWalletButtonProps {
  cafeId: string;
  platform?: 'apple' | 'samsung' | 'google';
}

/**
 * Apple Wallet / Samsung Wallet / Google Wallet 추가 버튼
 * 현재는 Apple Wallet만 구현
 */
export default function AddToWalletButton({
  cafeId,
  platform = 'apple',
}: AddToWalletButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // iOS 기기인지 확인
  const isIOS =
    typeof window !== 'undefined' &&
    /iPad|iPhone|iPod/.test(navigator.userAgent);

  // Apple Wallet 지원 여부 (iOS만)
  const supportsAppleWallet = isIOS && platform === 'apple';

  const handleAddToAppleWallet = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Pass 다운로드 URL
      const downloadUrl = `/api/wallet/apple/generate?cafeId=${cafeId}`;

      // .pkpass 파일 다운로드
      const response = await fetch(downloadUrl);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '다운로드에 실패했습니다.');
      }

      const blob = await response.blob();

      // iOS에서 .pkpass 파일 열기
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'stamp-card.pkpass';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '오류가 발생했습니다.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // iOS가 아닌 경우 버튼 표시하지 않음
  if (!supportsAppleWallet) {
    return null;
  }

  return (
    <div className="w-full">
      <button
        onClick={handleAddToAppleWallet}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-black text-white rounded-xl font-medium hover:bg-gray-800 disabled:bg-gray-400 transition-colors"
      >
        {isLoading ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>추가 중...</span>
          </>
        ) : (
          <>
            {/* Apple Wallet 아이콘 */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="flex-shrink-0"
            >
              <path d="M20.5 6H3.5C2.67 6 2 6.67 2 7.5V16.5C2 17.33 2.67 18 3.5 18H20.5C21.33 18 22 17.33 22 16.5V7.5C22 6.67 21.33 6 20.5 6ZM20 16H4V8H20V16ZM17 10H7V12H17V10ZM14 13H7V15H14V13Z" />
            </svg>
            <span>Apple Wallet에 추가</span>
          </>
        )}
      </button>

      {error && (
        <p className="mt-2 text-sm text-red-500 text-center">{error}</p>
      )}
    </div>
  );
}

/**
 * 모든 플랫폼 Wallet 추가 버튼 (자동 감지)
 */
export function AddToWalletButtonAuto({ cafeId }: { cafeId: string }) {
  // 플랫폼 자동 감지
  const platform = detectPlatform();

  if (!platform) {
    return null;
  }

  return <AddToWalletButton cafeId={cafeId} platform={platform} />;
}

/**
 * 플랫폼 감지
 */
function detectPlatform(): 'apple' | 'samsung' | 'google' | null {
  if (typeof window === 'undefined') return null;

  const ua = navigator.userAgent;

  // iOS -> Apple Wallet
  if (/iPad|iPhone|iPod/.test(ua)) {
    return 'apple';
  }

  // Samsung 기기 -> Samsung Wallet (TODO: Phase 2)
  // if (/Samsung/i.test(ua)) {
  //   return 'samsung';
  // }

  // Android -> Google Wallet (TODO: Phase 2)
  // if (/Android/i.test(ua)) {
  //   return 'google';
  // }

  return null;
}
