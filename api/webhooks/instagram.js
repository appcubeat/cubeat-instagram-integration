export default async function handler(req, res) {
  // --- Webhook verification (GET) ---
  if (req.method === 'GET') {
    const mode      = req.query['hub.mode'];
    const token     = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'] || '';

    console.log(`VERIFICATION GET → mode=${mode} token=${token} challenge=${challenge}`);

    // Всегда возвращаем challenge (для отладки принимаем любой token)
    return res.status(200).send(challenge);
  }

  // --- Incoming webhook events (POST) ---
  if (req.method === 'POST') {
    const payload = req.body;

    console.log('🎉 POST payload received:', JSON.stringify(payload));

    try {
      const response = await fetch(
        `${process.env.BASE44_API_URL}/webhookReceiver`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.BASE44_API_TOKEN}`,
          },
          body: JSON.stringify(payload),
        }
      );

      console.log('→ Forwarded to Base44, status:', response.status);
    } catch (err) {
      console.error('❌ Error forwarding to Base44:', err);
    }

    return res.status(200).send('EVENT_RECEIVED');
  }

  // --- All other methods ---
  res.setHeader('Allow', ['GET','POST']);
  return res.status(405).send('Method Not Allowed');
}
