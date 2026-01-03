import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ajqemwdukxmlyyuzcxdc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqcWVtd2R1a3htbHl5dXpjeGRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3MTI2ODgsImV4cCI6MjA4MTI4ODY4OH0.xP1dTYFw51nJWYMzaCNcAj5taqGcUX0OXrOtogjTYME';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 타입 정의
export interface User {
  id: string;
  toss_user_key: string | null; // PWA에서는 사용 안 함
  kakao_id: string | null; // 카카오 로그인 ID
  name: string;
  phone: string | null; // 선택 (카카오 로그인 시 없을 수 있음)
  email: string | null; // 카카오에서 가져온 이메일
  profile_image: string | null; // 프로필 이미지 URL
  role: 'customer' | 'owner' | 'admin';
  created_at: string;
}

export interface Cafe {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  address: string;
  phone: string | null;
  image_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  stamp_goal: number;
  short_code: string; // NFC/QR URL용 단축 코드
  created_at: string;
}

export interface Menu {
  id: string;
  cafe_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string;
  options: MenuOption[];
  is_available: boolean;
}

export interface MenuOption {
  name: string;
  type: 'single' | 'multiple';
  choices: { name: string; price: number }[];
}

export interface Order {
  id: string;
  order_no: string;
  user_id: string;
  cafe_id: string;
  status: 'pending' | 'paid' | 'accepted' | 'preparing' | 'ready' | 'picked_up' | 'cancelled';
  total_amount: number;
  pay_token: string | null;
  paid_at: string | null;
  created_at: string;
  // 조인된 데이터
  cafe?: Cafe;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_id: string;
  menu_name: string;
  quantity: number;
  unit_price: number;
  options: { name: string; choice: string; price: number }[];
  subtotal: number;
}

export interface Stamp {
  id: string;
  user_id: string;
  cafe_id: string;
  count: number;
  total_earned: number;
  total_used: number;
  // 조인된 데이터
  cafe?: Cafe;
}

export interface StampToken {
  id: string;
  cafe_id: string;
  token: string;
  created_by: string; // 토큰 생성한 사장님/직원 ID
  expires_at: string;
  used_by: string | null; // 사용한 고객 ID
  used_at: string | null;
  created_at: string;
}

export interface RegistrationCode {
  id: string;
  code: string;
  created_at: string;
  used_by: string | null;
  used_at: string | null;
}
