import { User, Cafe, Stamp } from '../supabase';

// Wallet 플랫폼 타입
export type WalletPlatform = 'apple' | 'samsung' | 'google';

// Wallet Pass DB 레코드
export interface WalletPass {
  id: string;
  user_id: string;
  cafe_id: string;
  platform: WalletPlatform;
  pass_serial_number: string;
  auth_token: string;
  apple_device_library_id: string | null;
  apple_push_token: string | null;
  samsung_ref_id: string | null;
  google_object_id: string | null;
  status: 'active' | 'deleted';
  created_at: string;
  updated_at: string;
}

// Pass 생성에 필요한 데이터
export interface PassData {
  user: User;
  cafe: Cafe;
  stamp: Stamp;
}

// Pass 생성 결과
export interface PassGenerationResult {
  platform: WalletPlatform;
  passBuffer?: Buffer; // Apple: .pkpass 파일
  downloadUrl?: string;
  addToWalletUrl?: string; // Samsung/Google
  serialNumber: string;
  authToken: string;
}

// Apple Pass 업데이트 Push 결과
export interface PushResult {
  success: boolean;
  pushToken: string;
  error?: string;
}

// Cafe의 Wallet 설정
export interface CafeWalletConfig {
  apple_enabled: boolean;
  samsung_enabled: boolean;
  google_enabled: boolean;
  pass_background_color: string;
  pass_foreground_color: string;
  pass_label_color: string;
}

// Pass 업데이트 로그
export interface PassUpdateLog {
  id: string;
  wallet_pass_id: string;
  event_type:
    | 'created'
    | 'registered'
    | 'updated'
    | 'push_sent'
    | 'push_failed'
    | 'deleted';
  stamp_count: number | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

// Apple Web Service 요청 타입
export interface AppleDeviceRegistration {
  pushToken: string;
}

export interface AppleSerialNumbers {
  serialNumbers: string[];
  lastUpdated: string;
}
