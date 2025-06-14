// api/webhooks/instagram.js

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Facebook верификация
    const challenge = req.query['hub.challenge'] || ''
    console.log('VERIFICATION GET:', req.url, '→', challenge)
    return res.status(200).send(challenge)
  }

  if (req.method === 'POST') {
    try {
      const body = req.body
      console.log('INCOMING WEBHOOK:', JSON.stringify(body))

      // Перешлём «сырую» нагрузку в Base44, он её обработает и запишет ChatMessage
      const resp = await fetch(
        `${process.env.BASE44_API_URL}/webhookReceiver`,
        {
          method:  'POST',
          headers: {
            'Content-Type': 'application/json',
            'api_key':       process.env.BASE44_API_TOKEN
          },
          body: JSON.stringify(body)
        }
      )

      if (!resp.ok) {
        const txt = await resp.text()
        console.error('Base44 webhookReceiver error:', resp.status, txt)
      } else {
        console.log('✅ Forwarded to Base44 webhookReceiver')
      }

      // Всегда возвращаем 200 для Instagram
      return res.status(200).send('EVENT_RECEIVED')
    } catch (e) {
      console.error('❌ Handler error:', e)
      return res.status(500).send('Server Error')
    }
  }

  return res.status(405).send('Method Not Allowed')
}
