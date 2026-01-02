# 토스페이 결제 API 명세

## 개요

앱인토스 미니앱에서 토스페이를 통한 결제 연동 가이드

**Base URL**: `https://pay-apps-in-toss-api.toss.im`

---

## 결제 플로우

```
[고객] 주문하기 클릭
        ↓
[서버] 1. 결제 생성 (make-payment)
        ↓
      payToken 발급
        ↓
[앱]   2. 결제 인증 (checkoutPayment SDK)
        ↓
      사용자 인증 (토스 결제창)
        ↓
[서버] 3. 결제 실행 (execute-payment)
        ↓
      결제 완료 (실제 출금)
```

---

## API 목록

| API | Method | 용도 |
|-----|--------|------|
| `/api-partner/v1/apps-in-toss/pay/make-payment` | POST | 결제 생성 |
| `/api-partner/v1/apps-in-toss/pay/execute-payment` | POST | 결제 실행 (승인) |
| `/api-partner/v1/apps-in-toss/pay/refund-payment` | POST | 환불 |
| `/api-partner/v1/apps-in-toss/pay/get-payment-status` | POST | 상태 조회 |

---

## 1. 결제 생성

결제 건을 생성하고 `payToken`을 발급받습니다.

### Request

```http
POST /api-partner/v1/apps-in-toss/pay/make-payment
Content-Type: application/json
x-toss-user-key: {userKey}
```

### Parameters

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| orderNo | String | Y | 주문번호 (유니크, 50자 이내) |
| productDesc | String | Y | 상품 설명 (255자 이내) |
| amount | Integer | Y | 총 결제 금액 |
| amountTaxFree | Integer | Y | 비과세 금액 (과세 상품은 0) |
| amountTaxable | Integer | N | 과세 금액 |
| amountVat | Integer | N | 부가세 |
| enablePayMethods | String | N | 결제수단 제한 (`TOSS_MONEY`, `CARD`) |
| cashReceipt | Boolean | N | 현금영수증 발급 여부 |
| isTestPayment | Boolean | Y | 테스트 결제 여부 |

### Example

```bash
curl -X POST 'https://pay-apps-in-toss-api.toss.im/api-partner/v1/apps-in-toss/pay/make-payment' \
  -H 'Content-Type: application/json' \
  -H 'x-toss-user-key: {userKey}' \
  -d '{
    "orderNo": "ORDER-2025-001",
    "productDesc": "아메리카노 외 2건",
    "amount": 12500,
    "amountTaxFree": 0,
    "isTestPayment": true
  }'
```

### Response

```json
{
  "resultType": "SUCCESS",
  "success": {
    "payToken": "O1NZck9XME8ureeVJVJP67"
  }
}
```

---

## 2. 결제 인증 (SDK)

토스페이 결제창을 띄워 사용자 인증을 수행합니다.

```typescript
import { checkoutPayment } from '@apps-in-toss/framework';

const result = await checkoutPayment({
  payToken: 'O1NZck9XME8ureeVJVJP67',
});

if (result.success) {
  // 인증 성공 → 서버에서 execute-payment 호출
}
```

> 인증만 수행하며, 실제 결제는 서버에서 `execute-payment`를 호출해야 합니다.

---

## 3. 결제 실행 (승인)

인증 완료 후 실제 결제를 승인합니다.

### Request

```http
POST /api-partner/v1/apps-in-toss/pay/execute-payment
Content-Type: application/json
x-toss-user-key: {userKey}
```

### Parameters

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| payToken | String | Y | 결제 생성 시 발급받은 토큰 |
| orderNo | String | N | 주문번호 |
| isTestPayment | Boolean | Y | 테스트 결제 여부 |

### Response (성공)

```json
{
  "resultType": "SUCCESS",
  "success": {
    "mode": "TEST",
    "orderNo": "ORDER-2025-001",
    "amount": 12500,
    "approvalTime": "2025-01-15 14:30:00",
    "stateMsg": "결제 완료",
    "discountedAmount": 0,
    "paidAmount": 12500,
    "payMethod": "CARD",
    "payToken": "O1NZck9XME8ureeVJVJP67",
    "transactionId": "45a77cf4-5577-4d5c-8827-4d4dd328bf12",
    "cardCompanyName": "신한",
    "cardNumber": "1234-****-****-5678",
    "spreadOut": "0"
  }
}
```

---

## 4. 환불

결제 건을 환불합니다.

### Request

```http
POST /api-partner/v1/apps-in-toss/pay/refund-payment
Content-Type: application/json
x-toss-user-key: {userKey}
```

### Parameters

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| payToken | String | Y | 결제 토큰 |
| reason | String | Y | 환불 사유 |
| isTestPayment | Boolean | Y | 테스트 결제 여부 |

---

## 5. 결제 상태 조회

### Request

```http
POST /api-partner/v1/apps-in-toss/pay/get-payment-status
Content-Type: application/json
x-toss-user-key: {userKey}
```

### Parameters

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| payToken | String | Y | 결제 토큰 |
| orderNo | String | Y | 주문번호 |
| isTestPayment | Boolean | Y | 테스트 결제 여부 |

---

## 결제 상태 코드

| 상태 | 설명 |
|------|------|
| PAY_STANDBY | 결제 대기 중 |
| PAY_APPROVED | 구매자 인증 완료 |
| PAY_CANCEL | 결제 취소 |
| PAY_PROGRESS | 결제 진행 중 |
| PAY_COMPLETE | 결제 완료 |
| REFUND_PROGRESS | 환불 진행 중 |
| REFUND_SUCCESS | 환불 성공 |

---

## 결제 수단

| 코드 | 설명 |
|------|------|
| TOSS_MONEY | 토스머니 |
| CARD | 카드 |

---

## 카드사 코드

| 코드 | 카드사 |
|------|--------|
| 1 | 신한 |
| 2 | 현대 |
| 3 | 삼성 |
| 4 | 국민 |
| 5 | 롯데 |
| 6 | 하나 |
| 7 | 우리 |
| 8 | 농협 |
| 10 | BC |

---

## 구현 시 고려사항

### 1. orderNo 관리
- 매 결제마다 유니크해야 함
- 형식 예시: `CAFE001-20250115-001`
- 중복 시 결제 생성 실패

### 2. 결제 실패 처리
- 인증 성공 후 execute 실패 케이스 대비
- get-payment-status로 상태 확인 필요

### 3. 환불 정책
- 전체 환불만 지원 (부분 환불 확인 필요)
- 환불 사유 기록 필수

### 4. 테스트 vs 라이브
- 샌드박스: `isTestPayment: true`
- 라이브: `isTestPayment: false`
- 주문번호 충돌 주의 (환경별 prefix 권장)
