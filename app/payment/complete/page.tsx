'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function CompleteContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const status = searchParams.get('status');

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        {status === 'success' ? (
          <>
            <div className="text-6xl mb-6">✅</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              결제 완료!
            </h1>
            <p className="text-gray-600 mb-6">
              주문이 성공적으로 접수되었습니다.
              <br />
              앱으로 돌아가서 주문 상태를 확인하세요.
            </p>
          </>
        ) : (
          <>
            <div className="text-6xl mb-6">❌</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              결제 실패
            </h1>
            <p className="text-gray-600 mb-6">
              결제 처리 중 문제가 발생했습니다.
              <br />
              다시 시도해주세요.
            </p>
          </>
        )}

        <p className="text-sm text-gray-400">
          이 창을 닫고 앱으로 돌아가세요.
        </p>
      </div>
    </div>
  );
}

export default function PaymentCompletePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-cafe-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CompleteContent />
    </Suspense>
  );
}
