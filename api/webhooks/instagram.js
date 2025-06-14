// api/webhooks/instagram.js

export default async function handler(req, res) {
  // 1) Верификация (GET-запрос от Facebook/Instagram)
  if (req.method === 'GET') {
    const challenge = req.query['hub.challenge'] || '';
    console.log('VERIFICATION GET:', req.url, '→', challenge);
    return res.status(200).send(challenge);
  }

  // 2) Получение реальных событий (POST)
  if (req.method === 'POST') {
    try {
      console.log('INCOMING WEBHOOK:', JSON.stringify(req.body));

      const entry  = Array.isArray(req.body.entry) && req.body.entry[0];
      const change = entry && Array.isArray(entry.changes) && entry.changes[0];
      const value  = change && change.value;

      if (!value?.sender?.id || !value?.recipient?.id || !value?.message?.mid) {
        console.warn('Webhook payload missing required fields');
        return res.status(400).send('Bad Request');
      }

      // Извлекаем нужные значения
      const instagram_user_id    = String(value.sender.id);
      const client_id            = String(value.recipient.id);
      const instagram_message_id = String(value.message.mid);
      const message_text         = String(value.message.text || '');

      // Парсим timestamp (секунды → ms)
      const tsNum = Number(value.timestamp);
      const timestamp = isNaN(tsNum)
        ? new Date().toISOString()
        : new Date(tsNum * 1000).toISOString();

      // Формируем payload для Base44
      const payload = {
        client_id,
        instagram_user_id,
        instagram_message_id,
        direction:    'incoming',
        message_text,
        timestamp,
      };

      // Шлём в Base44
      const BASE44_API_URL   = process.env.BASE44_API_URL;   // e.g. https://app.base44.com/api/apps/XXX/entities/ChatMessage
      const BASE44_API_TOKEN = process.env.BASE44_API_TOKEN;

      const resp = await fetch(BASE44_API_URL, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          'api_key':       BASE44_API_TOKEN,
        },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const text = await resp.text();
        console.error('❌ Base44 returned error:', resp.status, text);
      } else {
        const saved = await resp.json();
        console.log('✅ Saved ChatMessage to Base44:', saved);
      }

      return res.status(200).send('EVENT_RECEIVED');
    } catch (err) {
      console.error('❌ Error in handler:', err);
      return res.status(500).send('Internal Server Error');
    }
  }

  // 3) Остальные методы запрещены
  return res.status(405).send('Method Not Allowed');
}
