# Database Schema (Supabase)

## ERD 개요

```
┌─────────────┐       ┌─────────────┐
│   users     │       │   cafes     │
│─────────────│       │─────────────│
│ id (PK)     │       │ id (PK)     │
│ toss_user_id│       │ owner_id(FK)│──┐
│ name        │       │ name        │  │
│ role        │       │ status      │  │
└─────────────┘       └─────────────┘  │
      │                     │          │
      │                     │          │
      ▼                     ▼          │
┌─────────────┐       ┌─────────────┐  │
│   orders    │       │   menus     │  │
│─────────────│       │─────────────│  │
│ id (PK)     │       │ id (PK)     │  │
│ user_id(FK) │       │ cafe_id(FK) │  │
│ cafe_id(FK) │       │ name        │  │
│ status      │       │ price       │  │
│ total_amount│       │ options     │  │
└─────────────┘       └─────────────┘  │
      │                                │
      ▼                                │
┌─────────────┐       ┌─────────────┐  │
│ order_items │       │  stamps     │  │
│─────────────│       │─────────────│  │
│ id (PK)     │       │ id (PK)     │  │
│ order_id(FK)│       │ user_id(FK) │──┘
│ menu_id(FK) │       │ cafe_id(FK) │
│ quantity    │       │ count       │
│ options     │       │             │
└─────────────┘       └─────────────┘
```

---

## 테이블 정의

### 1. users (사용자)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| toss_user_key | text | 토스 로그인 userKey |
| name | text | 이름 |
| phone | text | 전화번호 (nullable) |
| role | enum | 'customer', 'owner', 'admin' |
| created_at | timestamp | 가입일 |

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  toss_user_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  role TEXT DEFAULT 'customer' CHECK (role IN ('customer', 'owner', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 2. cafes (카페)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| owner_id | uuid | FK → users |
| name | text | 카페 이름 |
| description | text | 소개 |
| address | text | 주소 |
| phone | text | 전화번호 |
| image_url | text | 대표 이미지 |
| status | enum | 'pending', 'approved', 'rejected' |
| stamp_goal | int | 스탬프 목표 (기본 10) |
| created_at | timestamp | 등록일 |

```sql
CREATE TABLE cafes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  phone TEXT,
  image_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  stamp_goal INT DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 3. menus (메뉴)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| cafe_id | uuid | FK → cafes |
| name | text | 메뉴 이름 |
| description | text | 설명 |
| price | int | 가격 (원) |
| image_url | text | 이미지 |
| category | text | 카테고리 (커피, 음료, 디저트 등) |
| options | jsonb | 옵션 (사이즈, 샷 추가 등) |
| is_available | bool | 판매 가능 여부 |
| created_at | timestamp | 등록일 |

```sql
CREATE TABLE menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id UUID REFERENCES cafes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price INT NOT NULL,
  image_url TEXT,
  category TEXT DEFAULT '커피',
  options JSONB DEFAULT '[]',
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**options 예시:**
```json
[
  {
    "name": "사이즈",
    "type": "single",
    "choices": [
      { "name": "Regular", "price": 0 },
      { "name": "Large", "price": 500 }
    ]
  },
  {
    "name": "샷 추가",
    "type": "single",
    "choices": [
      { "name": "없음", "price": 0 },
      { "name": "1샷", "price": 500 },
      { "name": "2샷", "price": 1000 }
    ]
  }
]
```

---

### 4. orders (주문)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| order_no | text | 주문번호 (토스페이 연동용) |
| user_id | uuid | FK → users |
| cafe_id | uuid | FK → cafes |
| status | enum | 주문 상태 |
| total_amount | int | 총 금액 |
| pay_token | text | 토스페이 토큰 |
| paid_at | timestamp | 결제 완료 시간 |
| created_at | timestamp | 주문 생성 시간 |

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id),
  cafe_id UUID REFERENCES cafes(id),
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',      -- 결제 대기
    'paid',         -- 결제 완료
    'accepted',     -- 주문 접수
    'preparing',    -- 제조 중
    'ready',        -- 준비 완료
    'picked_up',    -- 픽업 완료
    'cancelled'     -- 취소
  )),
  total_amount INT NOT NULL,
  pay_token TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 5. order_items (주문 항목)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| order_id | uuid | FK → orders |
| menu_id | uuid | FK → menus |
| menu_name | text | 메뉴 이름 (스냅샷) |
| quantity | int | 수량 |
| unit_price | int | 단가 |
| options | jsonb | 선택한 옵션 |
| subtotal | int | 소계 |

```sql
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  menu_id UUID REFERENCES menus(id),
  menu_name TEXT NOT NULL,
  quantity INT DEFAULT 1,
  unit_price INT NOT NULL,
  options JSONB DEFAULT '[]',
  subtotal INT NOT NULL
);
```

---

### 6. stamps (스탬프)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| user_id | uuid | FK → users |
| cafe_id | uuid | FK → cafes |
| count | int | 현재 스탬프 수 |
| total_earned | int | 총 적립 수 |
| total_used | int | 총 사용 수 |
| updated_at | timestamp | 마지막 업데이트 |

```sql
CREATE TABLE stamps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  cafe_id UUID REFERENCES cafes(id) ON DELETE CASCADE,
  count INT DEFAULT 0,
  total_earned INT DEFAULT 0,
  total_used INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, cafe_id)
);
```

---

### 7. stamp_history (스탬프 내역)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| stamp_id | uuid | FK → stamps |
| order_id | uuid | FK → orders (nullable) |
| type | enum | 'earn', 'use' |
| amount | int | 변동량 |
| created_at | timestamp | 발생 시간 |

```sql
CREATE TABLE stamp_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stamp_id UUID REFERENCES stamps(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id),
  type TEXT CHECK (type IN ('earn', 'use')),
  amount INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 8. stamp_tokens (NFC 적립 토큰)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| cafe_id | uuid | FK → cafes |
| token | text | 6자리 랜덤 토큰 |
| created_by | uuid | FK → users (생성한 사장님/직원) |
| expires_at | timestamp | 만료 시간 (생성 후 30초) |
| used_by | uuid | FK → users (사용한 고객, nullable) |
| used_at | timestamp | 사용 시간 (nullable) |
| created_at | timestamp | 생성 시간 |

```sql
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

-- 토큰 조회 인덱스
CREATE INDEX idx_stamp_tokens_cafe_token ON stamp_tokens(cafe_id, token);
CREATE INDEX idx_stamp_tokens_expires ON stamp_tokens(expires_at);
```

---

## Supabase 실시간 구독

주문 상태 변경 시 실시간 알림을 위해 Realtime 활성화:

```sql
-- orders 테이블 실시간 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
```

---

## RLS (Row Level Security) 정책

```sql
-- users: 본인 데이터만 조회/수정
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid()::text = toss_user_key);

-- cafes: 누구나 approved 카페 조회 가능
ALTER TABLE cafes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view approved cafes" ON cafes
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Owners can manage own cafe" ON cafes
  FOR ALL USING (owner_id = auth.uid());

-- orders: 본인 주문만 조회, 카페 주인은 자기 카페 주문 조회
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Cafe owners can view cafe orders" ON orders
  FOR SELECT USING (
    cafe_id IN (SELECT id FROM cafes WHERE owner_id = auth.uid())
  );
```

---

## 인덱스

```sql
-- 자주 조회되는 컬럼에 인덱스
CREATE INDEX idx_cafes_status ON cafes(status);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_cafe_id ON orders(cafe_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_menus_cafe_id ON menus(cafe_id);
CREATE INDEX idx_stamps_user_cafe ON stamps(user_id, cafe_id);
```
