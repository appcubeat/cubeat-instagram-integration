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

    const changes = Array.isArray(payload.entry)
      ? payload.entry.flatMap(e => Array.isArray(e.changes) ? e.changes : [])
      : [];

    for (const ch of changes) {
      if (ch.field !== 'messages') continue;

      // учитываем вложенный value.value
      let msg = ch.value;
      if (msg && typeof msg === 'object' && msg.value && typeof msg.value === 'object') {
        msg = msg.value;
      }

      // валидируем наличие необходимых полей
      const sid = msg?.sender?.id;
      const rid = msg?.recipient?.id;
      const mid = msg?.message?.mid;
      if (!sid || !rid || !mid) {
        console.warn('❗️ Skipping invalid message payload:', JSON.stringify(msg));
        continue;
      }

      const record = {
        client_id:            rid,
        instagram_user_id:    sid,
        instagram_message_id: mid,
        direction:            'incoming',
        message_text:         msg.message.text || '',
        timestamp:            parseInt(msg.timestamp, 10) || Date.now()
      };

      try {
        const resp = await fetch(
          `${process.env.BASE44_API_URL}/entities/ChatMessage`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'api_key':        process.env.BASE44_API_TOKEN
            },
            body: JSON.stringify(record)
          }
        );

        if (!resp.ok) {
          console.error('❌ Base44 returned error:', resp.status, await resp.text());
        } else {
          console.log('✅ Saved ChatMessage to Base44:', record);
        }
      } catch (err) {
        console.error('❌ Error saving to Base44:', err);
      }
    }

    return res.status(200).send('EVENT_RECEIVED');
  }

  // всё остальное
  return res.status(405).send('Method Not Allowed');
}
