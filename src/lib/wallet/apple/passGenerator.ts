import { PKPass } from 'passkit-generator';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { PassData, PassGenerationResult, CafeWalletConfig } from '../types';
import { supabase } from '../../supabase';

// 환경 변수
const PASS_TYPE_ID = process.env.APPLE_PASS_TYPE_ID!;
const TEAM_ID = process.env.APPLE_TEAM_ID!;
const WEB_SERVICE_URL = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/wallet/apple`
  : 'https://your-domain.com/api/wallet/apple';

// 인증서 경로
const CERTS_DIR = process.env.APPLE_CERTS_DIR || path.join(process.cwd(), 'certs');

/**
 * 인증 토큰 생성
 */
function generateAuthToken(serialNumber: string): string {
  const secret = process.env.APPLE_AUTH_SECRET || 'local-cafe-secret';
  return crypto
    .createHmac('sha256', secret)
    .update(serialNumber)
    .digest('hex')
    .substring(0, 32);
}

/**
 * 인증 토큰 검증
 */
export function validateAuthToken(
  token: string | undefined,
  serialNumber: string
): boolean {
  if (!token) return false;
  const expected = generateAuthToken(serialNumber);
  return token === expected;
}

/**
 * Apple Wallet Pass 생성
 */
export async function generateApplePass(
  data: PassData
): Promise<PassGenerationResult> {
  const { user, cafe, stamp } = data;

  // Serial Number 생성 (카페ID-사용자ID)
  const serialNumber = `${cafe.id}-${user.id}`;
  const authToken = generateAuthToken(serialNumber);

  // Wallet 설정 가져오기
  const walletConfig = (cafe.wallet_config as CafeWalletConfig) || {
    pass_background_color: '#8B4513',
    pass_foreground_color: '#FFFFFF',
    pass_label_color: '#F5DEB3',
  };

  // QR 코드 데이터
  const qrData = JSON.stringify({
    type: 'stamp_earn',
    cafeId: cafe.id,
    passSerial: serialNumber,
  });

  // Pass 템플릿 경로
  const templatePath = path.join(
    process.cwd(),
    'src/lib/wallet/apple/pass-template.pass'
  );

  // 인증서 읽기
  let certificates;
  try {
    const passphrase = process.env.APPLE_PASS_KEY_PASSWORD;
    certificates = {
      wwdr: fs.readFileSync(path.join(CERTS_DIR, 'AppleWWDRCAG4.pem')),
      signerCert: fs.readFileSync(path.join(CERTS_DIR, 'pass.pem')),
      signerKey: fs.readFileSync(path.join(CERTS_DIR, 'pass-key.pem')),
      ...(passphrase ? { signerKeyPassphrase: passphrase } : {}),
    };
  } catch (error) {
    console.error('인증서 파일을 찾을 수 없습니다:', error);
    throw new Error(
      '인증서가 설정되지 않았습니다. Apple Developer 계정 설정이 필요합니다.'
    );
  }

  // PKPass 생성
  // webServiceURL은 HTTPS가 필요하므로 개발 환경에서는 제외
  const isProduction = process.env.NODE_ENV === 'production' &&
    WEB_SERVICE_URL.startsWith('https://');

  const pass = await PKPass.from(
    {
      model: templatePath,
      certificates,
    },
    {
      serialNumber,
      authenticationToken: authToken,
      passTypeIdentifier: PASS_TYPE_ID,
      teamIdentifier: TEAM_ID,
      ...(isProduction ? { webServiceURL: WEB_SERVICE_URL } : {}),
    }
  );

  // 동적 필드 설정 (passkit-generator v3 API)
  // headerFields, primaryFields 등은 pass 객체에서 직접 접근
  if (pass.headerFields && pass.headerFields.length > 0) {
    pass.headerFields[0].value = `${stamp.count}/${cafe.stamp_goal}`;
  }
  if (pass.primaryFields && pass.primaryFields.length > 0) {
    pass.primaryFields[0].value = cafe.name;
  }
  if (pass.secondaryFields && pass.secondaryFields.length > 0) {
    pass.secondaryFields[0].value = `${cafe.stamp_goal}개 모으면 무료 음료!`;
  }
  if (pass.auxiliaryFields && pass.auxiliaryFields.length > 0) {
    pass.auxiliaryFields[0].value = user.name;
  }
  if (pass.backFields && pass.backFields.length > 0) {
    pass.backFields[0].value = formatPhone(user.phone);
    if (pass.backFields.length > 1) pass.backFields[1].value = `${stamp.total_earned}개`;
    if (pass.backFields.length > 2) pass.backFields[2].value = `${stamp.total_used}잔`;
  }

  // QR 코드
  pass.setBarcodes({
    format: 'PKBarcodeFormatQR',
    message: qrData,
    messageEncoding: 'iso-8859-1',
  });

  // 색상 설정 (pass.json에서 이미 설정됨, 필요시 props로 오버라이드)
  pass.props.backgroundColor = walletConfig.pass_background_color;
  pass.props.foregroundColor = walletConfig.pass_foreground_color;
  pass.props.labelColor = walletConfig.pass_label_color;

  // Pass 버퍼 생성
  const passBuffer = pass.getAsBuffer();

  // DB에 Wallet Pass 레코드 저장/업데이트
  await saveWalletPassRecord({
    userId: user.id,
    cafeId: cafe.id,
    serialNumber,
    authToken,
    stampCount: stamp.count,
  });

  return {
    platform: 'apple',
    passBuffer,
    serialNumber,
    authToken,
  };
}

/**
 * Pass 업데이트 (스탬프 변경 시)
 */
export async function updateApplePass(data: PassData): Promise<Buffer> {
  const { user, cafe, stamp } = data;

  const serialNumber = `${cafe.id}-${user.id}`;
  const authToken = generateAuthToken(serialNumber);

  const walletConfig = (cafe.wallet_config as CafeWalletConfig) || {
    pass_background_color: '#8B4513',
    pass_foreground_color: '#FFFFFF',
    pass_label_color: '#F5DEB3',
  };

  const qrData = JSON.stringify({
    type: 'stamp_earn',
    cafeId: cafe.id,
    passSerial: serialNumber,
  });

  const templatePath = path.join(
    process.cwd(),
    'src/lib/wallet/apple/pass-template.pass'
  );

  let certificates;
  try {
    const passphrase = process.env.APPLE_PASS_KEY_PASSWORD;
    certificates = {
      wwdr: fs.readFileSync(path.join(CERTS_DIR, 'AppleWWDRCAG4.pem')),
      signerCert: fs.readFileSync(path.join(CERTS_DIR, 'pass.pem')),
      signerKey: fs.readFileSync(path.join(CERTS_DIR, 'pass-key.pem')),
      ...(passphrase ? { signerKeyPassphrase: passphrase } : {}),
    };
  } catch (error) {
    throw new Error('인증서 파일을 찾을 수 없습니다.');
  }

  const pass = await PKPass.from(
    {
      model: templatePath,
      certificates,
    },
    {
      serialNumber,
      authenticationToken: authToken,
      passTypeIdentifier: PASS_TYPE_ID,
      teamIdentifier: TEAM_ID,
      webServiceURL: WEB_SERVICE_URL,
    }
  );

  // 동적 필드 설정
  if (pass.headerFields && pass.headerFields.length > 0) {
    pass.headerFields[0].value = `${stamp.count}/${cafe.stamp_goal}`;
  }
  if (pass.primaryFields && pass.primaryFields.length > 0) {
    pass.primaryFields[0].value = cafe.name;
  }
  if (pass.secondaryFields && pass.secondaryFields.length > 0) {
    const remaining = cafe.stamp_goal - stamp.count;
    pass.secondaryFields[0].value = remaining > 0
      ? `${remaining}개 더 모으면 무료!`
      : '무료 음료 사용 가능!';
  }
  if (pass.auxiliaryFields && pass.auxiliaryFields.length > 0) {
    pass.auxiliaryFields[0].value = user.name;
  }
  if (pass.backFields && pass.backFields.length > 0) {
    pass.backFields[0].value = formatPhone(user.phone);
    if (pass.backFields.length > 1) pass.backFields[1].value = `${stamp.total_earned}개`;
    if (pass.backFields.length > 2) pass.backFields[2].value = `${stamp.total_used}잔`;
  }

  pass.setBarcodes({
    format: 'PKBarcodeFormatQR',
    message: qrData,
    messageEncoding: 'iso-8859-1',
  });

  pass.props.backgroundColor = walletConfig.pass_background_color;
  pass.props.foregroundColor = walletConfig.pass_foreground_color;
  pass.props.labelColor = walletConfig.pass_label_color;

  return pass.getAsBuffer();
}

/**
 * Wallet Pass 레코드 저장
 */
async function saveWalletPassRecord(params: {
  userId: string;
  cafeId: string;
  serialNumber: string;
  authToken: string;
  stampCount: number;
}): Promise<void> {
  const { userId, cafeId, serialNumber, authToken, stampCount } = params;

  // 기존 레코드 확인
  const { data: existing } = await supabase
    .from('wallet_passes')
    .select('id')
    .eq('user_id', userId)
    .eq('cafe_id', cafeId)
    .eq('platform', 'apple')
    .single();

  if (existing) {
    // 업데이트
    await supabase
      .from('wallet_passes')
      .update({
        pass_serial_number: serialNumber,
        auth_token: authToken,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
  } else {
    // 새로 생성
    const { data: newPass } = await supabase
      .from('wallet_passes')
      .insert({
        user_id: userId,
        cafe_id: cafeId,
        platform: 'apple',
        pass_serial_number: serialNumber,
        auth_token: authToken,
      })
      .select()
      .single();

    // 생성 로그
    if (newPass) {
      await supabase.from('pass_update_logs').insert({
        wallet_pass_id: newPass.id,
        event_type: 'created',
        stamp_count: stampCount,
        details: { platform: 'apple' },
      });
    }
  }
}

/**
 * 전화번호 포맷팅
 */
function formatPhone(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  return phone;
}
