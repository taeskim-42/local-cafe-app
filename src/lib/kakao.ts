import { supabase, User } from './supabase';

declare global {
  interface Window {
    Kakao: any;
  }
}

let isKakaoInitialized = false;

/**
 * 카카오 SDK 초기화
 */
export function initKakao(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isKakaoInitialized) {
      resolve();
      return;
    }

    if (typeof window === 'undefined') {
      reject(new Error('브라우저 환경이 아닙니다.'));
      return;
    }

    // 이미 로드되어 있는 경우
    if (window.Kakao) {
      if (!window.Kakao.isInitialized()) {
        window.Kakao.init(process.env.NEXT_PUBLIC_KAKAO_JS_KEY);
      }
      isKakaoInitialized = true;
      resolve();
      return;
    }

    // SDK 스크립트 로드
    const script = document.createElement('script');
    script.src = 'https://developers.kakao.com/sdk/js/kakao.js';
    script.async = true;
    script.onload = () => {
      if (window.Kakao && !window.Kakao.isInitialized()) {
        window.Kakao.init(process.env.NEXT_PUBLIC_KAKAO_JS_KEY);
        console.log('Kakao SDK initialized:', window.Kakao.isInitialized());
      }
      isKakaoInitialized = true;
      resolve();
    };
    script.onerror = (e) => {
      console.error('Kakao SDK load error:', e);
      reject(new Error('카카오 SDK 로드 실패'));
    };
    document.head.appendChild(script);
  });
}

/**
 * 카카오 로그인
 */
export async function loginWithKakao(): Promise<User> {
  await initKakao();

  return new Promise((resolve, reject) => {
    window.Kakao.Auth.login({
      success: async (authObj: any) => {
        try {
          // 사용자 정보 가져오기
          const userInfo = await getKakaoUserInfo();
          // DB에 사용자 저장/조회
          const user = await findOrCreateKakaoUser(userInfo);
          // 로컬 세션 저장
          if (typeof window !== 'undefined') {
            localStorage.setItem('dev_user_id', user.id);
          }
          resolve(user);
        } catch (error) {
          reject(error);
        }
      },
      fail: (err: any) => {
        console.error('카카오 로그인 실패:', err);
        reject(new Error('카카오 로그인에 실패했습니다.'));
      },
    });
  });
}

/**
 * 카카오 사용자 정보 조회
 */
function getKakaoUserInfo(): Promise<KakaoUserInfo> {
  return new Promise((resolve, reject) => {
    window.Kakao.API.request({
      url: '/v2/user/me',
      success: (res: any) => {
        resolve({
          kakaoId: res.id.toString(),
          nickname: res.kakao_account?.profile?.nickname || '사용자',
          profileImage: res.kakao_account?.profile?.profile_image_url || null,
          email: res.kakao_account?.email || null,
        });
      },
      fail: (err: any) => {
        console.error('사용자 정보 조회 실패:', err);
        reject(new Error('사용자 정보를 가져오는데 실패했습니다.'));
      },
    });
  });
}

interface KakaoUserInfo {
  kakaoId: string;
  nickname: string;
  profileImage: string | null;
  email: string | null;
}

/**
 * 카카오 사용자 DB 저장/조회
 */
async function findOrCreateKakaoUser(kakaoInfo: KakaoUserInfo): Promise<User> {
  // 기존 사용자 조회 (kakao_id로)
  const { data: existing } = await supabase
    .from('users')
    .select('*')
    .eq('kakao_id', kakaoInfo.kakaoId)
    .single();

  if (existing) {
    return existing as User;
  }

  // 새 사용자 생성
  const { data: newUser, error } = await supabase
    .from('users')
    .insert({
      kakao_id: kakaoInfo.kakaoId,
      name: kakaoInfo.nickname,
      profile_image: kakaoInfo.profileImage,
      email: kakaoInfo.email,
      role: 'customer',
    })
    .select()
    .single();

  if (error) {
    console.error('사용자 생성 실패:', error);
    throw new Error(`사용자 생성 실패: ${error.message}`);
  }

  return newUser as User;
}

/**
 * 카카오 로그아웃
 */
export async function logoutKakao(): Promise<void> {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('dev_user_id');
  }

  try {
    await initKakao();
    if (window.Kakao.Auth.getAccessToken()) {
      await new Promise<void>((resolve) => {
        window.Kakao.Auth.logout(() => resolve());
      });
    }
  } catch (e) {
    // 카카오 로그아웃 실패해도 로컬 세션은 클리어
  }
}
