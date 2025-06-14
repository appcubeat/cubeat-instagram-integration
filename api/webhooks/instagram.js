export default async function handler(req, res) {
  if (req.method === 'GET') {
   const mode      = req.query['hub.mode'];
const token     = req.query['hub.verify_token'];
const challenge = req.query['hub.challenge'];
    const VERIFY_TOKEN = process.env.INSTAGRAM_VERIFY_TOKEN;
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Forbidden');
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
