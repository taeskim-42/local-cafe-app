# 동네카페 프로젝트 현황

## 프로젝트 개요
- **목적**: 동네 카페용 스탬프 적립 + 사이렌오더 스타일 주문 앱
- **기술 스택**: Next.js 14 (App Router), Supabase, TypeScript, Tailwind CSS
- **결제**: 카카오페이 (완료)
- **인증**: 카카오 로그인 (완료)

---

## 완료된 작업

### 1. 카카오 로그인 연동 ✅
- JavaScript 키: `9a4ac95335699e734f65b9cee9cdf249`
- Admin 키: `4ece128b67d1eb036a14516d09194c9b`
- 파일: `src/lib/kakao.ts`, `components/QuickLogin.tsx`

### 2. 데이터베이스 스키마 ✅
실행 완료된 SQL:
```sql
-- users 테이블 카카오 로그인용 컬럼
ALTER TABLE users ADD COLUMN IF NOT EXISTS kakao_id TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image TEXT;
ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE users ALTER COLUMN toss_user_key DROP NOT NULL;

-- NFC 적립 토큰 테이블
CREATE TABLE stamp_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id UUID REFERENCES cafes(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  used_by UUID REFERENCES users(id),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 카카오페이 결제 대기 테이블
CREATE TABLE pending_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT UNIQUE NOT NULL,
  tid TEXT NOT NULL DEFAULT '',
  user_id UUID REFERENCES users(id),
  cafe_id UUID REFERENCES cafes(id),
  items JSONB NOT NULL,
  total_amount INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. 주요 페이지 구현 ✅
| 경로 | 설명 | 상태 |
|------|------|------|
| `/` | 홈페이지 (카페 목록) | ✅ |
| `/c/[cafeId]` | 카페 랜딩 + 로그인 | ✅ |
| `/c/[cafeId]/order` | 메뉴 선택/주문 | ✅ |
| `/c/[cafeId]/checkout` | 결제 (카카오페이) | ✅ |
| `/c/[cafeId]/checkout/complete` | 주문 완료 | ✅ |
| `/c/[cafeId]/tap` | NFC 탭 적립 | ✅ |
| `/merchant/[cafeId]` | 사장님 적립 승인 | ✅ |
| `/merchant/[cafeId]/orders` | 주문 관리 | ✅ |

### 4. API 라우트 ✅
| 경로 | 설명 |
|------|------|
| `/api/orders` | 주문 생성 + 스탬프 적립 |
| `/api/kakaopay/ready` | 카카오페이 결제 준비 |
| `/api/kakaopay/pending` | 임시 주문 저장 |
| `/api/kakaopay/success` | 결제 성공 콜백 |
| `/api/kakaopay/cancel` | 결제 취소 콜백 |
| `/api/kakaopay/fail` | 결제 실패 콜백 |

---

## 완료된 추가 작업

### 카카오페이 결제 연동 ✅
**완료일**: 2026-01-02

- 카카오페이 DEV Secret Key 발급 완료
- `src/lib/kakaopay.ts`에서 `KAKAOPAY_SECRET_KEY` 사용
- 테스트 CID: `TC0ONETIME`
- 결제 준비/승인 API 정상 작동 확인

---

## 시나리오 정의

### 시나리오 1: 앱 주문 (사이렌 오더)
```
앱에서 메뉴 선택 → 카카오페이 결제 → 자동 스탬프 1개 적립 → 매장 픽업
```

### 시나리오 2: 매장 주문 + NFC 적립
```
매장에서 구두 주문 → 카드 결제 (기존 POS) → 사장님 "적립 허용" 버튼 →
고객 NFC 탭 (30초 이내) → 스탬프 1개 적립
```

**핵심**: 1 결제 = 1 스탬프 (통일)

---

## 환경 변수 (.env.local)
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://ajqemwdukxmlyyuzcxdc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Kakao Login
NEXT_PUBLIC_KAKAO_JS_KEY=9a4ac95335699e734f65b9cee9cdf249
KAKAO_ADMIN_KEY=4ece128b67d1eb036a14516d09194c9b

# KakaoPay (DEV)
KAKAOPAY_SECRET_KEY=DEV...

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 알려진 문제점 (TODO)

### 1. 사장님 페이지 접근 보안 없음 🔴
- `/merchant/[cafeId]/orders` → 누구나 URL만 알면 접근 가능
- 주문 취소, 상태 변경을 아무나 할 수 있음
- **해결**: 사장님 인증 필요 (카페 owner_id 확인)

### 2. 카페 등록/관리 기능 없음 🔴
- 현재 카페는 DB에 직접 넣어야 함
- 메뉴 수정, 가격 변경 불가
- **해결**: 사장님 대시보드 필요

### 3. NFC 적립 보안 취약 🟡
- `/c/[cafeId]/tap` → URL만 알면 무한 적립 가능
- **현재**: 사장님이 "적립 허용" 버튼 누른 후 30초간만 유효한 토큰 방식 (일부 구현됨)
- **해결**: 토큰 검증 강화 필요

### 4. 고객 재방문 유도 어려움 🟡
- 앱 설치가 아닌 웹이라 푸시 알림 한계
- **해결**: "홈 화면에 추가" 안내 팝업, PWA 강화

### 5. 오프라인 지원 없음 🟡
- 인터넷 끊기면 주문/적립 불가
- **해결**: PWA 오프라인 캐싱

### 6. 다중 기기 로그인 문제 🟡
- localStorage 기반 세션이라 기기별로 따로 로그인 필요
- **해결**: 서버 세션 또는 카카오 토큰 기반 인증

---

## 다음 할 일

1. **NFC 테스트**
   - NFC 태그 구매 (NTAG 215, 쿠팡에서 10개 6천원)
   - NFC Tools 앱으로 URL 기록
   - URL: `https://도메인/c/카페ID/tap`

2. **앱 아이콘 생성**
   - 카카오 개발자 콘솔용 500x500px PNG 필요

3. **프로덕션 배포 준비**
   - Vercel 배포
   - 카카오페이 PRD Secret Key 적용 (사업자 등록 후)
   - 도메인 연결

---

## 수익 모델 고려사항

**추천 모델**: 하이브리드
```
플랜 A: 무료 + 결제 수수료 1.5%
플랜 B: 월 15,000원 + 수수료 0%
```

- 소규모 카페는 수수료 모델 선호 (안 팔리면 비용 없음)
- 주문 많은 카페는 구독 모델 유리

---

## 주요 파일 구조
```
local-cafe-app/
├── app/
│   ├── page.tsx                 # 홈
│   ├── c/[cafeId]/
│   │   ├── page.tsx            # 카페 랜딩
│   │   ├── order/page.tsx      # 주문
│   │   ├── checkout/page.tsx   # 결제 (카카오페이)
│   │   ├── checkout/complete/  # 완료
│   │   └── tap/page.tsx        # NFC 적립
│   ├── merchant/[cafeId]/
│   │   ├── page.tsx            # 적립 승인
│   │   └── orders/page.tsx     # 주문 관리
│   └── api/
│       ├── orders/route.ts
│       └── kakaopay/
│           ├── ready/route.ts
│           ├── pending/route.ts
│           ├── success/route.ts
│           ├── cancel/route.ts
│           └── fail/route.ts
├── src/lib/
│   ├── supabase.ts
│   ├── api.ts
│   ├── auth.ts
│   ├── kakao.ts                # 카카오 로그인
│   └── kakaopay.ts             # 카카오페이 결제
├── components/
│   └── QuickLogin.tsx          # 카카오 로그인 버튼
└── docs/
    └── PROJECT_STATUS.md       # 이 파일
```

---

## 서버 실행
```bash
cd /Users/ts.k/Documents/GitHub/local-cafe-app
npm run dev
# http://localhost:3000
```

## 테스트 카페 ID
```
aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
```
