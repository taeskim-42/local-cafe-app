import http2 from 'http2';
import fs from 'fs';
import path from 'path';
import { PushResult } from '../types';
import { supabase } from '../../supabase';

// APNs 호스트
const APNS_HOST =
  process.env.NODE_ENV === 'production'
    ? 'api.push.apple.com'
    : 'api.sandbox.push.apple.com';

const CERTS_DIR = process.env.APPLE_CERTS_DIR || path.join(process.cwd(), 'certs');
const PASS_TYPE_ID = process.env.APPLE_PASS_TYPE_ID!;

/**
 * 특정 Pass에 등록된 모든 디바이스에 Push 전송
 */
export async function sendPassUpdatePush(
  passSerialNumber: string
): Promise<PushResult[]> {
  // 해당 Pass에 등록된 디바이스의 push token 조회
  const { data: passes, error } = await supabase
    .from('wallet_passes')
    .select('id, apple_push_token')
    .eq('pass_serial_number', passSerialNumber)
    .eq('platform', 'apple')
    .eq('status', 'active')
    .not('apple_push_token', 'is', null);

  if (error || !passes || passes.length === 0) {
    return [];
  }

  const results: PushResult[] = [];

  for (const pass of passes) {
    if (!pass.apple_push_token) continue;

    const result = await sendPush(pass.apple_push_token);
    results.push(result);

    // 로그 기록
    await supabase.from('pass_update_logs').insert({
      wallet_pass_id: pass.id,
      event_type: result.success ? 'push_sent' : 'push_failed',
      details: {
        pushToken: pass.apple_push_token.substring(0, 10) + '...',
        error: result.error,
      },
    });
  }

  return results;
}

/**
 * 단일 디바이스에 APNs Push 전송
 */
async function sendPush(pushToken: string): Promise<PushResult> {
  return new Promise((resolve) => {
    let certKey: Buffer;
    let certPem: Buffer;

    try {
      certKey = fs.readFileSync(path.join(CERTS_DIR, 'pass-key.pem'));
      certPem = fs.readFileSync(path.join(CERTS_DIR, 'pass.pem'));
    } catch (error) {
      resolve({
        success: false,
        pushToken,
        error: '인증서 파일을 찾을 수 없습니다.',
      });
      return;
    }

    const client = http2.connect(`https://${APNS_HOST}`, {
      key: certKey,
      cert: certPem,
    });

    client.on('error', (err) => {
      resolve({
        success: false,
        pushToken,
        error: `Connection error: ${err.message}`,
      });
    });

    const req = client.request({
      ':method': 'POST',
      ':path': `/3/device/${pushToken}`,
      'apns-topic': PASS_TYPE_ID,
      'apns-push-type': 'background',
      'apns-priority': '5',
    });

    req.setEncoding('utf8');

    // Apple Pass Push는 빈 payload를 보냄
    req.write(JSON.stringify({}));

    let responseData = '';

    req.on('response', (headers) => {
      const status = headers[':status'];

      req.on('data', (chunk) => {
        responseData += chunk;
      });

      req.on('end', () => {
        client.close();

        if (status === 200) {
          resolve({ success: true, pushToken });
        } else {
          let errorMessage = `Status: ${status}`;
          if (responseData) {
            try {
              const errorBody = JSON.parse(responseData);
              errorMessage = errorBody.reason || errorMessage;
            } catch {
              errorMessage = responseData || errorMessage;
            }
          }
          resolve({
            success: false,
            pushToken,
            error: errorMessage,
          });
        }
      });
    });

    req.on('error', (err) => {
      client.close();
      resolve({
        success: false,
        pushToken,
        error: `Request error: ${err.message}`,
      });
    });

    req.end();

    // 타임아웃 설정 (10초)
    setTimeout(() => {
      client.close();
      resolve({
        success: false,
        pushToken,
        error: 'Timeout',
      });
    }, 10000);
  });
}

/**
 * 사용자의 모든 Apple Wallet Pass에 업데이트 Push 전송
 */
export async function sendUserPassUpdatePush(
  userId: string,
  cafeId: string
): Promise<PushResult[]> {
  const { data: pass } = await supabase
    .from('wallet_passes')
    .select('pass_serial_number')
    .eq('user_id', userId)
    .eq('cafe_id', cafeId)
    .eq('platform', 'apple')
    .eq('status', 'active')
    .single();

  if (!pass) {
    return [];
  }

  return sendPassUpdatePush(pass.pass_serial_number);
}
