// api/webhooks/instagram.js

export default async function handler(req, res) {
  // 1) GET → Facebook/Instagram webhook verification
  if (req.method === 'GET') {
    const challenge = req.query['hub.challenge'] || '';
    console.log('VERIFICATION GET:', req.url, '→', challenge);
    return res.status(200).send(challenge);
  }

  // 2) POST → receiving real webhook events
  if (req.method === 'POST') {
    try {
      console.log('INCOMING WEBHOOK:', JSON.stringify(req.body));

      // извлекаем данные из payload
      const entry     = Array.isArray(req.body.entry)     ? req.body.entry[0]     : null;
      const change    = entry && Array.isArray(entry.changes) ? entry.changes[0]   : null;
      const value     = change ? change.value                : null;

      // если нет нужных полей — выходим
      if (!value || !value.sender || !value.recipient || !value.message) {
        console.warn('Webhook payload missing required fields');
        return res.status(400).send('Bad Request');
      }

      // подготавливаем поля для Base44
      const instagramUserId    = String(value.sender.id);
      const clientId           = String(value.recipient.id);
      const instagramMessageId = String(value.message.mid);
      const messageText        = String(value.message.text || '');
      // timestamp приходит в секундах или как строка
      const tsNum              = Number(value.timestamp);
      const timestampISO       = isNaN(tsNum)
        ? new Date().toISOString()
        : new Date(tsNum * 1000).toISOString();

      // формируем тело запроса в Base44
      const payload = {
        client_id:           clientId,
        instagram_user_id:   instagramUserId,
        instagram_message_id,
        direction:           'incoming',
        message_text:        messageText,
        timestamp:           timestampISO,
      };

      // шлём в Base44
      const base44Url   = process.env.BASE44_API_URL;   // например "https://app.base44.com/api/apps/{APP_ID}/entities/ChatMessage"
      const base44Token = process.env.BASE44_API_TOKEN;

      const resp = await fetch(base44Url, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          'api_key':       base44Token,
        },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        console.error('❌ Base44 returned error:', resp.status, errText);
      } else {
        const saved = await resp.json();
        console.log('✅ Saved ChatMessage to Base44:', saved);
      }

      // подтверждаем приём
      return res.status(200).send('EVENT_RECEIVED');
    } catch (e) {
      console.error('❌ Error in handler:', e);
      return res.status(500).send('Internal Server Error');
    }
  }

  // остальные методы не поддерживаем
  return res.status(405).send('Method Not Allowed');
}
