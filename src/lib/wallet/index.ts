import { User, Cafe, Stamp, supabase } from '../supabase';
import { generateApplePass, updateApplePass } from './apple/passGenerator';
import { sendUserPassUpdatePush } from './apple/pushService';
import { WalletPlatform, PassGenerationResult, PushResult } from './types';

export * from './types';

/**
 * Wallet Pass 생성 (플랫폼별)
 */
export async function generateWalletPass(
  platform: WalletPlatform,
  user: User,
  cafe: Cafe,
  stamp: Stamp
): Promise<PassGenerationResult> {
  const data = { user, cafe, stamp };

  switch (platform) {
    case 'apple':
      return generateApplePass(data);

    case 'samsung':
      // TODO: Phase 2에서 구현
      throw new Error('Samsung Wallet is not implemented yet');

    case 'google':
      // TODO: Phase 2에서 구현
      throw new Error('Google Wallet is not implemented yet');

    default:
      throw new Error(`Unknown platform: ${platform}`);
  }
}

/**
 * 스탬프 적립 후 모든 플랫폼 Wallet Pass 업데이트
 */
export async function updateAllWalletPasses(
  userId: string,
  cafeId: string,
  stamp: Stamp
): Promise<void> {
  // 해당 사용자의 모든 wallet_passes 조회
  const { data: passes, error } = await supabase
    .from('wallet_passes')
    .select('id, platform, pass_serial_number')
    .eq('user_id', userId)
    .eq('cafe_id', cafeId)
    .eq('status', 'active');

  if (error || !passes || passes.length === 0) {
    return;
  }

  for (const pass of passes) {
    try {
      switch (pass.platform) {
        case 'apple':
          // APNs Push 전송 -> Wallet이 최신 Pass 요청
          await sendUserPassUpdatePush(userId, cafeId);
          break;

        case 'samsung':
          // Samsung은 실시간 조회 방식 (별도 업데이트 불필요)
          break;

        case 'google':
          // TODO: Google Wallet API로 직접 업데이트
          break;
      }

      // 업데이트 로그
      await supabase.from('pass_update_logs').insert({
        wallet_pass_id: pass.id,
        event_type: 'updated',
        stamp_count: stamp.count,
        details: { platform: pass.platform },
      });
    } catch (error) {
      console.error(`Pass update failed for ${pass.platform}:`, error);

      await supabase.from('pass_update_logs').insert({
        wallet_pass_id: pass.id,
        event_type: 'push_failed',
        stamp_count: stamp.count,
        details: { platform: pass.platform, error: String(error) },
      });
    }
  }
}

/**
 * 사용자의 특정 카페 Wallet Pass 상태 조회
 */
export async function getUserWalletPassStatus(
  userId: string,
  cafeId: string
): Promise<{
  apple: boolean;
  samsung: boolean;
  google: boolean;
}> {
  const { data: passes } = await supabase
    .from('wallet_passes')
    .select('platform')
    .eq('user_id', userId)
    .eq('cafe_id', cafeId)
    .eq('status', 'active');

  const result = {
    apple: false,
    samsung: false,
    google: false,
  };

  if (passes) {
    for (const pass of passes) {
      if (pass.platform in result) {
        result[pass.platform as WalletPlatform] = true;
      }
    }
  }

  return result;
}
