#!/bin/bash

# Apple Wallet 인증서 설정 스크립트

echo "=== Apple Wallet 인증서 설정 ==="
echo ""

# 1. 개인키 생성
if [ ! -f "pass-key.pem" ]; then
  echo "[1/4] 개인키 생성 중..."
  openssl genrsa -out pass-key.pem 2048
  echo "✓ pass-key.pem 생성 완료"
else
  echo "[1/4] pass-key.pem 이미 존재함 (건너뜀)"
fi

# 2. CSR 생성
if [ ! -f "pass.csr" ]; then
  echo "[2/4] CSR 생성 중..."
  openssl req -new -key pass-key.pem -out pass.csr -subj "/CN=Pass Certificate/O=Local Cafe"
  echo "✓ pass.csr 생성 완료"
  echo ""
  echo ">>> pass.csr 파일을 Apple Developer Portal에 업로드하세요:"
  echo "    https://developer.apple.com/account/resources/certificates/add"
  echo ""
else
  echo "[2/4] pass.csr 이미 존재함 (건너뜀)"
fi

# 3. WWDR 인증서 다운로드
if [ ! -f "AppleWWDRCAG4.pem" ]; then
  echo "[3/4] Apple WWDR 인증서 다운로드 중..."
  curl -s -o AppleWWDRCAG4.cer https://www.apple.com/certificateauthority/AppleWWDRCAG4.cer
  openssl x509 -inform DER -in AppleWWDRCAG4.cer -out AppleWWDRCAG4.pem
  rm AppleWWDRCAG4.cer
  echo "✓ AppleWWDRCAG4.pem 다운로드 완료"
else
  echo "[3/4] AppleWWDRCAG4.pem 이미 존재함 (건너뜀)"
fi

# 4. pass.cer 변환 확인
if [ -f "pass.cer" ]; then
  echo "[4/4] pass.cer → pass.pem 변환 중..."
  openssl x509 -inform DER -in pass.cer -out pass.pem
  echo "✓ pass.pem 변환 완료"
elif [ -f "pass.pem" ]; then
  echo "[4/4] pass.pem 이미 존재함"
else
  echo "[4/4] pass.cer 파일이 없습니다."
  echo ""
  echo ">>> Apple Developer Portal에서 인증서를 발급받은 후"
  echo "    pass.cer 파일을 이 폴더에 넣고 다시 실행하세요."
fi

echo ""
echo "=== 현재 파일 상태 ==="
ls -la *.pem 2>/dev/null || echo "(pem 파일 없음)"

echo ""
echo "=== 다음 단계 ==="
if [ -f "pass.pem" ] && [ -f "pass-key.pem" ] && [ -f "AppleWWDRCAG4.pem" ]; then
  echo "✓ 모든 인증서 준비 완료!"
  echo ""
  echo ".env.local 파일에 다음을 추가하세요:"
  echo ""
  echo "APPLE_TEAM_ID=YOUR_TEAM_ID"
  echo "APPLE_PASS_TYPE_ID=pass.com.yourcompany.localcafe"
  echo "APPLE_WWDR_CERT_PATH=./certs/AppleWWDRCAG4.pem"
  echo "APPLE_PASS_CERT_PATH=./certs/pass.pem"
  echo "APPLE_PASS_KEY_PATH=./certs/pass-key.pem"
  echo "APPLE_PASS_KEY_PASSWORD="
else
  echo "1. pass.csr를 Apple Developer Portal에 업로드"
  echo "2. 발급받은 pass.cer를 이 폴더에 복사"
  echo "3. 이 스크립트 다시 실행"
fi
