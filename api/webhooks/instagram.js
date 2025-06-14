export default async function handler(req, res) {
  if (req.method === 'GET') {
    const challenge = req.query['hub.challenge'] || '';
    console.log('VERIFICATION GET:', req.url, '→', challenge);
    return res.status(200).send(challenge);
  }

  if (req.method === 'POST') {
    const payload = req.body;
    console.log('INCOMING WEBHOOK:', JSON.stringify(payload));

    const changes = (payload.entry || []).flatMap(e => e.changes || []);
    for (const ch of changes) {
      if (ch.field !== 'messages') continue;

      // Распакуем вложенный value.value, если есть
      let msg = ch.value;
      if (msg?.value) msg = msg.value;

      const sid = msg?.sender?.id;
      const rid = msg?.recipient?.id;
      const mid = msg?.message?.mid;
      if (!sid || !rid || !mid) {
        console.warn('Skipping invalid payload:', JSON.stringify(msg));
        continue;
      }

      // Формируем запись, приводя timestamp к строке
      const record = {
        client_id:            String(rid),
        instagram_user_id:    String(sid),
        instagram_message_id: String(mid),
        direction:            'incoming',
        message_text:         msg.message.text || '',
        timestamp:            String(msg.timestamp || Date.now())
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
          console.log('✅ Saved ChatMessage:', record);
        }
      } catch (err) {
        console.error('❌ Error saving to Base44:', err);
      }
    }

    return res.status(200).send('EVENT_RECEIVED');
  }

  return res.status(405).send('Method Not Allowed');
}
