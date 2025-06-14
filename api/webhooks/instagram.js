export default async function handler(req, res) {
  // --- GET-верификация от Facebook/Instagram ---
  if (req.method === 'GET') {
    const challenge = req.query['hub.challenge'] || '';
    console.log('VERIFICATION GET:', req.url, '→', challenge);
    return res.status(200).send(challenge);
  }

  // --- POST — реальный вебхук от Instagram ---
  if (req.method === 'POST') {
    try {
      const payload = req.body;               // весь объект entry/changes
      console.log('🎉 POST payload received:', JSON.stringify(payload));

      // вынимаем сами сообщения
      const changes = payload.entry?.[0]?.changes;
      if (Array.isArray(changes)) {
        for (const ch of changes) {
          if (ch.field === 'messages') {
            const msg = ch.value;

            // сохраняем в Base44 как новую ChatMessage
            await fetch(
              `${process.env.BASE44_API_URL}/entities/ChatMessage`,
              {
                method: 'POST',
                headers: {
                  'Content-Type':  'application/json',
                  'api_key':       process.env.BASE44_API_TOKEN
                },
                body: JSON.stringify({
                  client_id:          msg.recipient.id,
                  instagram_user_id:  msg.sender.id,
                  instagram_message_id: msg.message.mid,
                  direction:          'incoming',
                  message_text:       msg.message.text,
                  timestamp:          parseInt(msg.timestamp, 10)
                })
              }
            );
            console.log('✅ Forwarded to Base44 ChatMessage');
          }
        }
      }

      return res.status(200).send('EVENT_RECEIVED');
    } catch (err) {
      console.error('❌ Error forwarding to Base44:', err);
      return res.status(500).send('SERVER_ERROR');
    }
  }

  return res.status(405).send('Method Not Allowed');
}
