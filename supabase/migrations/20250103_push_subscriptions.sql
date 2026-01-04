-- Push Subscriptions 테이블 (Web Push + Expo Push 통합)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,  -- Web Push endpoint 또는 Expo Push Token
  platform TEXT DEFAULT 'web',  -- 'web', 'ios', 'android'
  keys JSONB,  -- Web Push용 키 (p256dh, auth)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);

-- RLS 정책
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 사용자 본인의 구독만 조회/수정 가능
CREATE POLICY IF NOT EXISTS "Users can view own subscriptions"
  ON push_subscriptions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can insert own subscriptions"
  ON push_subscriptions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can update own subscriptions"
  ON push_subscriptions FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can delete own subscriptions"
  ON push_subscriptions FOR DELETE
  USING (user_id = auth.uid());

-- 서비스 역할은 모든 구독 접근 가능 (API에서 알림 전송용)
-- Service role key를 사용하면 RLS 우회됨
