import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

// VAPIDキーとサブジェクトを環境変数から取得
const vapidKeys = {
  publicKey: Deno.env.get('VAPID_PUBLIC_KEY')!,
  privateKey: Deno.env.get('VAPID_PRIVATE_KEY')!,
};
webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT')!, vapidKeys.publicKey, vapidKeys.privateKey);

Deno.serve(async (req) => {
  try {
    const { recipient_id, title, body, tag, href } = await req.json();

    // Supabaseクライアントを初期化
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 受信者の購読情報をデータベースから取得
    const { data: subscriptions, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', recipient_id);

    if (error) throw error;
    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ message: 'No subscriptions found for user.' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    const notificationPayload = JSON.stringify({ title, body, tag, href });

    // 全ての購読情報に対してプッシュ通知を送信
    const sendPromises = subscriptions.map((s) => webpush.sendNotification(s.subscription, notificationPayload));

    await Promise.all(sendPromises);

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    console.error('Error sending push notification:', err);
    // Catch block variable 'err' is of type 'unknown'
    const errorMessage = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
