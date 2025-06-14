// api/webhooks/instagram.js

export default async function handler(req, res) {
  // 1) Верификация webhook при подключении
  if (req.method === 'GET') {
    const mode      = req.query['hub.mode'];
    const token     = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.INSTAGRAM_VERIFY_TOKEN) {
      console.log('✅ Verification success:', challenge);
      return res.status(200).send(challenge);
    } else {
      console.warn('❌ Verification failed:', req.url);
      return res.status(403).send('Forbidden');
    }
  }

  // 2) Обработка входящих webhook-событий
  if (req.method === 'POST') {
    try {
      console.log('INCOMING WEBHOOK:', JSON.stringify(req.body));

      // извлекаем нужные поля
      const entry = req.body.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;

      const instagram_user_id    = value?.sender?.id;
      const client_id            = value?.recipient?.id;
      const instagram_message_id = value?.message?.mid;
      const message_text         = value?.message?.text;
      const timestamp            = value?.timestamp?.toString(); // string по требованиям Base44

      if (!instagram_user_id || !client_id || !instagram_message_id) {
        console.error('🔴 Missing fields in webhook payload', value);
        return res.status(400).send('Bad Request');
      }

      const chatMessage = {
        client_id,
        instagram_user_id,
        instagram_message_id,
        direction: 'incoming',
        message_text,
        timestamp
      };

      // отправляем POST в Base44 REST API
      const resp = await fetch(
        `${process.env.BASE44_API_URL}/entities/ChatMessage`,
        {
          method: 'POST',
          headers: {
            'api_key': process.env.BASE44_API_TOKEN,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(chatMessage)
        }
      );

      if (!resp.ok) {
        const err = await resp.text();
        console.error('❌ Base44 returned error:', resp.status, err);
        return res.status(500).send('Error forwarding to Base44');
      }

      const saved = await resp.json();
      console.log('✅ Saved ChatMessage to Base44:', saved);

      // Facebook/Instagram требует быстрый 200
      return res.status(200).send('EVENT_RECEIVED');
    } catch (e) {
      console.error('❌ Error in handler:', e);
      return res.status(500).send('Internal Server Error');
    }
  }

  // остальные HTTP методы не поддерживаются
  return res.status(405).send('Method Not Allowed');
}
