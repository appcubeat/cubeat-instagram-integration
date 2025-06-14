// api/webhooks/instagram.js

export default async function handler(req, res) {
  // 1) Верификация Webhook от Meta (GET)
  if (req.method === 'GET') {
    const challenge = req.query['hub.challenge'] || '';
    console.log('VERIFICATION GET:', req.url, '→', challenge);
    return res.status(200).send(challenge);
  }

  // 2) Приём реальных уведомлений (POST)
  if (req.method === 'POST') {
    console.log('INCOMING WEBHOOK:', JSON.stringify(req.body));

    try {
      // разбираем payload
      const change = req.body.entry?.[0]?.changes?.[0];
      const data = change?.value;
      if (!data) {
        throw new Error('No change.value in payload');
      }

      const senderId    = data.sender?.id;
      const recipientId = data.recipient?.id;
      const msg         = data.message;
      const mid         = msg?.mid;
      const text        = msg?.text;
      const ts          = data.timestamp; // уже строка, если пришла строкой

      // формируем объект для Base44
      const chatMessage = {
        client_id:           recipientId,
        instagram_user_id:   senderId,
        instagram_message_id: mid,
        direction:           'incoming',
        message_text:        text,
        timestamp:           ts.toString()
      };

      // отправляем в Base44 REST API
      const resp = await fetch(
        `${process.env.BASE44_API_URL}/entities/ChatMessage`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api_key':       process.env.BASE44_API_TOKEN
          },
          body: JSON.stringify(chatMessage)
        }
      );

      if (!resp.ok) {
        const errorBody = await resp.text();
        console.error('❌ Base44 returned error:', resp.status, errorBody);
        return res
          .status(500)
          .send(`Base44 webhookReceiver error: ${resp.status} ${errorBody}`);
      }

      const saved = await resp.json();
      console.log('✅ Saved ChatMessage:', saved);

      // отвечаем Meta быстро 200 OK
      return res.status(200).send('EVENT_RECEIVED');
    } catch (err) {
      console.error('❌ Error in handler:', err);
      return res.status(500).send(`Error in handler: ${err.message}`);
    }
  }

  // всё остальное — не поддерживается
  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).send('Method Not Allowed');
}
