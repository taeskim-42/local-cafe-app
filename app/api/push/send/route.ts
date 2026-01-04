import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
}

async function sendExpoPushNotification(messages: ExpoPushMessage[]) {
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  });

  return response.json();
}

export async function POST(request: NextRequest) {
  try {
    const { userId, orderId, title, body, type } = await request.json();

    if (!userId || !title || !body) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 사용자의 push 구독 정보 가져오기
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint, platform')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching subscriptions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions' },
        { status: 500 }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json(
        { message: 'No subscriptions found for user' },
        { status: 200 }
      );
    }

    // Expo Push 토큰 필터링 (ExponentPushToken으로 시작)
    const expoPushTokens = subscriptions
      .filter(sub => sub.endpoint.startsWith('ExponentPushToken'))
      .map(sub => sub.endpoint);

    if (expoPushTokens.length === 0) {
      return NextResponse.json(
        { message: 'No mobile push tokens found' },
        { status: 200 }
      );
    }

    // Expo Push 메시지 생성
    const messages: ExpoPushMessage[] = expoPushTokens.map(token => ({
      to: token,
      title,
      body,
      data: { orderId, type },
      sound: 'default',
    }));

    // 알림 전송
    const result = await sendExpoPushNotification(messages);
    console.log('Push notification result:', result);

    return NextResponse.json({
      success: true,
      sent: expoPushTokens.length,
      result,
    });
  } catch (error) {
    console.error('Error sending push notification:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}
