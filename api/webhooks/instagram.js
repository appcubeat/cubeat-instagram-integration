export default async function handler(req, res) {
  // 1. Верификация Facebook/Instagram webhook
  if (req.method === 'GET') {
    const challenge = req.query['hub.challenge'] || '';
    console.log('VERIFICATION GET:', req.url, '→', challenge);
    return res.status(200).send(challenge);
  }

  // 2. Обработка входящих событий
  if (req.method === 'POST') {
    try {
      console.log('INCOMING WEBHOOK:', JSON.stringify(req.body));

      // Парсим payload
      const entry = req.body.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;
      if (!value) {
        console.warn('No value in webhook payload');
        return res.sendStatus(400);
      }

      const senderId   = value.sender?.id;
      const recipientId= value.recipient?.id;
      const { mid, text } = value.message || {};
      const timestamp  = value.timestamp;

      // Подготовка тела для Base44
      const payload = {
        client_id:             recipientId,
        instagram_user_id:     senderId,
        instagram_message_id:  mid,
        direction:             'incoming',
        message_text:          text,
        timestamp:             String(timestamp),
      };

      // Сохраняем в Base44 через REST API сущностей
      const response = await fetch(
        `${process.env.BASE44_API_URL}/entities/ChatMessage`,
        {
          method:  'POST',
          headers: {
            'Content-Type': 'application/json',
            'api_key':       process.env.BASE44_API_TOKEN,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const err = await response.text();
        console.error('❌ Base44 returned error:', response.status, err);
        return res.status(500).send(`Error saving to Base44: ${err}`);
      }

      const result = await response.json();
      console.log('✅ Saved ChatMessage to Base44:', result);
      return res.status(200).send('EVENT_RECEIVED');

    } catch (e) {
      console.error('❌ Error in handler:', e);
      return res.status(500).send('Internal Server Error');
    }
  }

  // 3. Другие методы не поддерживаются
  return res.status(405).send('Method Not Allowed');
}
