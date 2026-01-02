-- PWA 전환을 위한 DB 마이그레이션
-- Supabase SQL Editor에서 실행

-- ============================================
-- 1. users 테이블 수정
-- ============================================

-- toss_user_key를 nullable로 변경 (PWA에서는 사용 안 함)
ALTER TABLE users
  ALTER COLUMN toss_user_key DROP NOT NULL;

-- phone 컬럼에 unique 인덱스 추가
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- ============================================
-- 2. cafes 테이블 수정
-- ============================================

-- short_code 컬럼 추가 (NFC/QR URL용)
ALTER TABLE cafes
  ADD COLUMN IF NOT EXISTS short_code TEXT UNIQUE;

-- 기존 카페들에 short_code 자동 생성
UPDATE cafes
SET short_code = LOWER(SUBSTRING(MD5(id::TEXT) FROM 1 FOR 8))
WHERE short_code IS NULL;

-- 새 카페 생성 시 자동으로 short_code 생성하는 트리거
CREATE OR REPLACE FUNCTION generate_cafe_short_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.short_code IS NULL THEN
    NEW.short_code := LOWER(SUBSTRING(MD5(NEW.id::TEXT) FROM 1 FOR 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_cafe_short_code ON cafes;
CREATE TRIGGER set_cafe_short_code
  BEFORE INSERT ON cafes
  FOR EACH ROW
  EXECUTE FUNCTION generate_cafe_short_code();

-- ============================================
-- 3. stamp_history 테이블 수정
-- ============================================

-- source 컬럼 추가 (적립 출처)
ALTER TABLE stamp_history
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'order'
    CHECK (source IN ('order', 'customer_scan', 'merchant_manual'));

-- merchant_id 컬럼 추가 (수동 적립 시 담당자)
ALTER TABLE stamp_history
  ADD COLUMN IF NOT EXISTS merchant_id UUID REFERENCES users(id);

-- 쿨다운/한도 체크를 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_stamp_history_created_at
  ON stamp_history(created_at);

CREATE INDEX IF NOT EXISTS idx_stamp_history_stamp_type
  ON stamp_history(stamp_id, type, created_at);

-- ============================================
-- 4. Supabase Auth 설정 (대시보드에서)
-- ============================================
--
-- Authentication > Providers > Phone 활성화
-- SMS Provider 설정 (Twilio 등)
--
-- 참고: https://supabase.com/docs/guides/auth/phone-login

-- ============================================
-- 5. RLS 정책 업데이트
-- ============================================

-- stamps 테이블: 본인 스탬프만 조회/수정
DROP POLICY IF EXISTS "Users can view own stamps" ON stamps;
CREATE POLICY "Users can view own stamps" ON stamps
  FOR SELECT USING (
    user_id::text = auth.uid()::text
    OR user_id IN (SELECT id FROM users WHERE phone = (SELECT phone FROM auth.users WHERE id = auth.uid()))
  );

-- stamp_history 테이블: 본인 히스토리만 조회
DROP POLICY IF EXISTS "Users can view own stamp history" ON stamp_history;
CREATE POLICY "Users can view own stamp history" ON stamp_history
  FOR SELECT USING (
    stamp_id IN (
      SELECT id FROM stamps WHERE user_id IN (
        SELECT id FROM users WHERE phone = (SELECT phone FROM auth.users WHERE id = auth.uid())
      )
    )
  );

-- ============================================
-- 6. Wallet Passes 테이블 (Apple/Samsung/Google)
-- ============================================

CREATE TABLE IF NOT EXISTS wallet_passes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  cafe_id UUID REFERENCES cafes(id) ON DELETE CASCADE,

  -- Pass 식별 정보
  platform TEXT NOT NULL CHECK (platform IN ('apple', 'samsung', 'google')),
  pass_serial_number TEXT NOT NULL,
  auth_token TEXT NOT NULL,  -- Pass 인증 토큰

  -- Apple Wallet 전용
  apple_device_library_id TEXT,
  apple_push_token TEXT,

  -- Samsung Wallet 전용
  samsung_ref_id TEXT,

  -- Google Wallet 전용
  google_object_id TEXT,

  -- 상태
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'deleted')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, cafe_id, platform)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_wallet_passes_user ON wallet_passes(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_passes_cafe ON wallet_passes(cafe_id);
CREATE INDEX IF NOT EXISTS idx_wallet_passes_serial ON wallet_passes(pass_serial_number);
CREATE INDEX IF NOT EXISTS idx_wallet_passes_platform ON wallet_passes(platform);

-- Pass 업데이트 로그 (디버깅용)
CREATE TABLE IF NOT EXISTS pass_update_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_pass_id UUID REFERENCES wallet_passes(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,  -- 'created', 'registered', 'updated', 'push_sent', 'push_failed', 'deleted'
  stamp_count INT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- cafes 테이블에 wallet_config 추가
ALTER TABLE cafes
  ADD COLUMN IF NOT EXISTS wallet_config JSONB DEFAULT '{
    "apple_enabled": true,
    "samsung_enabled": false,
    "google_enabled": false,
    "pass_background_color": "#8B4513",
    "pass_foreground_color": "#FFFFFF",
    "pass_label_color": "#F5DEB3"
  }';

-- ============================================
-- 7. 테스트 데이터 (개발용)
-- ============================================

-- 테스트 카페 생성 (필요시)
-- INSERT INTO cafes (name, address, status, stamp_goal, owner_id)
-- VALUES ('테스트 카페', '서울시 강남구', 'approved', 10, 'owner-uuid-here');
