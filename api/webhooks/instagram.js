export default async function handler(req, res) {
  if (req.method === 'GET') {
    // DEBUG: сразу возвращаем любой hub.challenge без проверок
    const challenge = req.query['hub.challenge'] || '';
    console.log('VERIFICATION GET:', req.url, '→', challenge);
    return res.status(200).send(challenge);
  }

  if (req.method === 'POST') {
    const payload = req.body;
    // Перешлём всё в ваш Base44 API для сохранения
    await fetch(`${process.env.BASE44_API_URL}/webhookReceiver`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${process.env.BASE44_API_TOKEN}`
      },
      body: JSON.stringify(payload)
    });
    return res.status(200).send('EVENT_RECEIVED');
  }

  return res.status(405).send('Method Not Allowed');
}
