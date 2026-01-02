# Apple Wallet 인증서 설정 가이드

## 1. Pass Certificate 발급

### Apple Developer Portal에서:
1. [Certificates](https://developer.apple.com/account/resources/certificates/list) 이동
2. **+** 버튼 클릭
3. **Services** 섹션에서 **Pass Type ID Certificate** 선택
4. 방금 만든 Pass Type ID 선택
5. CSR 파일 업로드 (아래 참조)
6. 다운로드 → `pass.cer`

### CSR 파일 생성 (터미널에서):
```bash
# 개인키 생성
openssl genrsa -out pass-key.pem 2048

# CSR 생성
openssl req -new -key pass-key.pem -out pass.csr
```

### .cer → .pem 변환:
```bash
# pass.cer를 pem으로 변환
openssl x509 -inform DER -in pass.cer -out pass.pem
```

## 2. Apple WWDR 인증서 다운로드

Apple Worldwide Developer Relations 인증서가 필요합니다:

```bash
# WWDR G4 인증서 다운로드
curl -o AppleWWDRCAG4.cer https://www.apple.com/certificateauthority/AppleWWDRCAG4.cer

# PEM으로 변환
openssl x509 -inform DER -in AppleWWDRCAG4.cer -out AppleWWDRCAG4.pem
```

## 3. 최종 파일 구조

```
certs/
├── AppleWWDRCAG4.pem   # Apple WWDR 인증서
├── pass.pem            # Pass 인증서
└── pass-key.pem        # 개인키
```

## 4. 환경 변수 설정

`.env.local` 파일에 추가:

```env
APPLE_TEAM_ID=YOUR_TEAM_ID
APPLE_PASS_TYPE_ID=pass.com.yourcompany.localcafe
APPLE_WWDR_CERT_PATH=./certs/AppleWWDRCAG4.pem
APPLE_PASS_CERT_PATH=./certs/pass.pem
APPLE_PASS_KEY_PATH=./certs/pass-key.pem
APPLE_PASS_KEY_PASSWORD=
```

> `APPLE_PASS_KEY_PASSWORD`는 개인키 생성 시 비밀번호를 설정하지 않았다면 비워두세요.

## 빠른 설정 명령어

```bash
cd certs

# 1. 개인키 생성 (비밀번호 없이)
openssl genrsa -out pass-key.pem 2048

# 2. CSR 생성 (Apple Portal에 업로드용)
openssl req -new -key pass-key.pem -out pass.csr -subj "/CN=Pass Certificate/O=Your Company"

# 3. WWDR 인증서 다운로드
curl -o AppleWWDRCAG4.cer https://www.apple.com/certificateauthority/AppleWWDRCAG4.cer
openssl x509 -inform DER -in AppleWWDRCAG4.cer -out AppleWWDRCAG4.pem

# 4. Apple Portal에서 pass.cer 다운로드 후:
openssl x509 -inform DER -in pass.cer -out pass.pem
```
