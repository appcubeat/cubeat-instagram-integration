export default async function handler(req, res) {
  // проверка GET-запроса (верификация Facebook/Instagram)
  if (req.method === 'GET') {
    const challenge = req.query['hub.challenge'] || '';
    console.log('VERIFICATION GET:', req.url, '→', challenge);
    return res.status(200).send(challenge);
  }

  // при POST-запросе (реальные события)
  if (req.method === 'POST') {
    const payload = req.body;
    console.log('INCOMING WEBHOOK:', JSON.stringify(payload, null, 2));

    // сохраняем сообщение в сущность ChatMessage в Base44
    try {
      const resp = await fetch(
        `${process.env.BASE44_API_URL}/entities/ChatMessage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api_key': process.env.BASE44_API_TOKEN
          },
          body: JSON.stringify({
            client_id: payload.value.recipient.id,
            instagram_user_id: payload.value.sender.id,
            instagram_message_id: payload.value.message.mid,
            direction: 'inbound',
            message_text: payload.value.message.text,
            timestamp: payload.value.timestamp
          })
        }
      );
      if (!resp.ok) {
        console.error('Failed to save to Base44:', await resp.text());
      } else {
        console.log('Saved to Base44:', await resp.json());
      }
    } catch (err) {
      console.error('Error saving to Base44:', err);
    }

    // подтверждаем получение вебхука
    return res.status(200).send('EVENT_RECEIVED');
  }

  // все остальные методы — не поддерживаются
  return res.status(405).send('Method Not Allowed');
}
