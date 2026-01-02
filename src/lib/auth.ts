import { supabase, User } from './supabase';

/**
 * 전화번호 정규화 (하이픈 제거, 국가코드 추가)
 */
export function normalizePhoneNumber(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '');
  // 한국 번호: 010으로 시작하면 +82 추가
  if (digits.startsWith('010')) {
    return `+82${digits.slice(1)}`;
  }
  // 이미 국가코드가 있으면 그대로
  if (digits.startsWith('82')) {
    return `+${digits}`;
  }
  return `+82${digits}`;
}

/**
 * OTP 발송
 * 개발 모드에서는 실제 SMS 발송 없이 성공 처리
 */
export async function sendOTP(phone: string): Promise<void> {
  const normalizedPhone = normalizePhoneNumber(phone);

  // 개발 모드: SMS 발송 스킵
  if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEV_MODE === 'true') {
    console.log('[DEV] OTP 발송 스킵:', normalizedPhone);
    return;
  }

  const { error } = await supabase.auth.signInWithOtp({
    phone: normalizedPhone,
  });

  if (error) {
    console.error('OTP 발송 실패:', error);
    throw new Error('인증번호 발송에 실패했습니다. 잠시 후 다시 시도해주세요.');
  }
}

/**
 * OTP 검증 및 로그인
 * 개발 모드에서는 인증번호 "000000" 또는 아무 6자리로 로그인 가능
 */
export async function verifyOTP(phone: string, otp: string): Promise<User> {
  const normalizedPhone = normalizePhoneNumber(phone);

  // 개발 모드: OTP 검증 스킵 (6자리면 통과)
  if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEV_MODE === 'true') {
    if (otp.length === 6) {
      console.log('[DEV] OTP 검증 스킵:', normalizedPhone);
      const user = await findOrCreateUser(normalizedPhone);
      // 개발 모드: localStorage에 사용자 ID 저장
      if (typeof window !== 'undefined') {
        localStorage.setItem('dev_user_id', user.id);
      }
      return user;
    }
    throw new Error('인증번호 6자리를 입력해주세요.');
  }

  const { data, error } = await supabase.auth.verifyOtp({
    phone: normalizedPhone,
    token: otp,
    type: 'sms',
  });

  if (error) {
    console.error('OTP 검증 실패:', error);
    throw new Error('인증번호가 올바르지 않습니다.');
  }

  // 사용자 프로필 조회 또는 생성
  const user = await findOrCreateUser(normalizedPhone);
  return user;
}

/**
 * 전화번호로 사용자 조회 또는 생성
 */
export async function findOrCreateUser(phone: string): Promise<User> {
  const normalizedPhone = normalizePhoneNumber(phone);
  const phoneDigits = normalizedPhone.replace('+82', '0');

  // 기존 사용자 조회
  const { data: existing } = await supabase
    .from('users')
    .select('*')
    .eq('phone', phoneDigits)
    .single();

  if (existing) {
    return existing as User;
  }

  // 새 사용자 생성
  const { data: newUser, error } = await supabase
    .from('users')
    .insert({
      phone: phoneDigits,
      name: '사용자',
      role: 'customer',
    })
    .select()
    .single();

  if (error) {
    console.error('사용자 생성 실패:', error);
    throw new Error('사용자 생성에 실패했습니다.');
  }

  return newUser as User;
}

/**
 * 전화번호로 사용자 조회 (수동 적립용)
 */
export async function findUserByPhone(phone: string): Promise<User | null> {
  const digits = phone.replace(/[^0-9]/g, '');

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('phone', digits)
    .single();

  if (error) {
    return null;
  }

  return data as User;
}

/**
 * 현재 세션의 사용자 정보 조회
 */
export async function getCurrentUser(): Promise<User | null> {
  // localStorage에서 사용자 ID 확인 (카카오 로그인 포함)
  if (typeof window !== 'undefined') {
    const userId = localStorage.getItem('dev_user_id');
    if (userId) {
      return getUser(userId);
    }
  }
  return null;
}

/**
 * 로그아웃
 */
export async function signOut(): Promise<void> {
  // localStorage 클리어
  if (typeof window !== 'undefined') {
    localStorage.removeItem('dev_user_id');
  }
  // 카카오 로그아웃 시도
  try {
    const { logoutKakao } = await import('./kakao');
    await logoutKakao();
  } catch (e) {
    // 카카오 로그아웃 실패해도 계속 진행
  }
}

/**
 * 사용자 역할 변경 (고객 ↔ 사장님)
 */
export async function updateUserRole(
  userId: string,
  role: 'customer' | 'owner'
): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .update({ role })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`역할 변경 실패: ${error.message}`);
  }

  return data as User;
}

/**
 * 사용자 정보 조회 (ID로)
 */
export async function getUser(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    return null;
  }

  return data as User;
}
