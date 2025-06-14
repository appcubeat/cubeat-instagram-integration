// api/webhooks/instagram.js

export default async function handler(req, res) {
  // 1) Верификация вебхука (GET)
  if (req.method === 'GET') {
    const mode      = req.query['hub.mode']
    const token     = req.query['hub.verify_token']
    const challenge = req.query['hub.challenge']
    if (mode === 'subscribe' && token === process.env.INSTAGRAM_VERIFY_TOKEN) {
      console.log('✅ Verified webhook with challenge:', challenge)
      return res.status(200).send(challenge)
    }
    console.warn('❌ Webhook verification failed:', req.url)
    return res.status(403).send('Forbidden')
  }

  // 2) Приём уведомлений (POST)
  if (req.method === 'POST') {
    try {
      console.log('INCOMING WEBHOOK:', JSON.stringify(req.body))

      // Разбор payload
      const change = req.body.entry?.[0]?.changes?.[0]?.value
      if (!change) {
        console.warn('No change.value in payload')
        return res.status(400).send('Bad Request')
      }

      const senderId    = String(change.sender?.id)
      const recipientId = String(change.recipient?.id)
      const mid         = String(change.message?.mid)
      const text        = String(change.message?.text || '')
      const tsSeconds   = Number(change.timestamp) || Math.floor(Date.now() / 1000)
      const timestamp   = new Date(tsSeconds * 1000).toISOString()

      if (!senderId || !recipientId || !mid) {
        console.warn('Missing required fields:', { senderId, recipientId, mid })
        return res.status(400).send('Bad Request')
      }

      // Подготовка записи для Base44
      const record = {
        client_id:            recipientId,
        instagram_user_id:    senderId,
        instagram_message_id: mid,
        direction:            'incoming',
        message_text:         text,
        timestamp:            timestamp
      }

      // Отправка в Base44 REST API
      const resp = await fetch(
        `${process.env.BASE44_API_URL}/entities/ChatMessage`,
        {
          method:  'POST',
          headers: {
            'Content-Type': 'application/json',
            'api_key':       process.env.BASE44_API_TOKEN
          },
          body: JSON.stringify(record)
        }
      )

      if (!resp.ok) {
        const errText = await resp.text()
        console.error('❌ Base44 API error:', resp.status, errText)
        return res.status(500).send('Error saving to Base44')
      }

      const saved = await resp.json()
      console.log('✅ Saved ChatMessage to Base44:', saved)
      return res.status(200).send('EVENT_RECEIVED')

    } catch (err) {
      console.error('❌ Error in handler:', err)
      return res.status(500).send('Internal Server Error')
    }
  }

  // 3) Остальные методы не поддерживаются
  res.setHeader('Allow', ['GET','POST'])
  return res.status(405).send('Method Not Allowed')
}
