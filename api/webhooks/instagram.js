export default async function handler(req, res) {
  // 1) GET–верификация
  if (req.method === 'GET') {
    const challenge = req.query['hub.challenge'] || '';
    console.log('VERIFICATION GET:', req.url, '→', challenge);
    return res.status(200).send(challenge);
  }

  // 2) POST–вебхук
  if (req.method === 'POST') {
    const payload = req.body;
    console.log('INCOMING WEBHOOK:', JSON.stringify(payload));

    // Попытаемся получить массив изменений
    const changes = Array.isArray(payload.entry)
      ? payload.entry.flatMap((e) => Array.isArray(e.changes) ? e.changes : [])
      : [];

    for (const ch of changes) {
      // нас интересуют только field === 'messages'
      if (ch.field !== 'messages') continue;

      const msg = ch.value;
      // гарантируем, что у нас есть sender и recipient
      if (!msg?.sender?.id || !msg?.recipient?.id || !msg?.message?.mid) {
        console.warn('❗️ Skipping invalid message payload:', JSON.stringify(msg));
        continue;
      }

      // готовим данные для сохранения
      const record = {
        client_id:           msg.recipient.id,
        instagram_user_id:   msg.sender.id,
        instagram_message_id: msg.message.mid,
        direction:           'incoming',
        message_text:        msg.message.text || '',
        timestamp:           parseInt(msg.timestamp, 10) || Date.now()
      };

      try {
        const resp = await fetch(
          `${process.env.BASE44_API_URL}/entities/ChatMessage`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'api_key':       process.env.BASE44_API_TOKEN
            },
            body: JSON.stringify(record)
          }
        );
        if (!resp.ok) {
          const errText = await resp.text();
          console.error('❌ Base44 returned error:', resp.status, errText);
        } else {
          console.log('✅ Saved ChatMessage to Base44:', record);
        }
      } catch (err) {
        console.error('❌ Error saving to Base44:', err);
      }
    }

    return res.status(200).send('EVENT_RECEIVED');
  }

  // всё остальное — Method Not Allowed
  return res.status(405).send('Method Not Allowed');
}
