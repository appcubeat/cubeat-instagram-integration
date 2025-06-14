// api/webhooks/instagram.js

export default async function handler(req, res) {
  // 1) GET — проверка от Facebook/Instagram
  if (req.method === 'GET') {
    const challenge = req.query['hub.challenge'] || ''
    console.log('VERIFICATION GET:', req.url, '→', challenge)
    return res.status(200).send(challenge)
  }

  // 2) POST — реальные обновления
  if (req.method === 'POST') {
    try {
      const body = req.body
      console.log('INCOMING WEBHOOK:', JSON.stringify(body))

      // вытаскиваем из payload
      const change = body.entry?.[0]?.changes?.[0]?.value
      if (!change) {
        console.warn('No change.value found')
        return res.status(400).send('Bad Request')
      }

      const senderId    = change.sender?.id
      const recipientId = change.recipient?.id
      const mid         = change.message?.mid
      const text        = change.message?.text
      const tsSeconds   = Number(change.timestamp) || 0

      // проверяем обязательные поля
      if (!senderId || !recipientId || !mid) {
        console.warn('Missing fields in webhook:', { senderId, recipientId, mid })
        return res.status(400).send('Bad Request')
      }

      // приводим timestamp к ISO
      const timestampIso = new Date(tsSeconds * 1000).toISOString()

      // формируем тело для Base44
      const payload = {
        client_id:            recipientId,
        instagram_user_id:    senderId,
        instagram_message_id: mid,
        direction:            'incoming',
        message_text:         text || '',
        timestamp:            timestampIso
      }

      // шлём в Base44
      const resp = await fetch(
        `${process.env.BASE44_API_URL}/entities/ChatMessage`,
        {
          method:  'POST',
          headers: {
            'Content-Type':  'application/json',
            'api_key':       process.env.BASE44_API_TOKEN
          },
          body: JSON.stringify(payload)
        }
      )

      if (!resp.ok) {
        const errText = await resp.text()
        console.error('Base44 returned error:', resp.status, errText)
      } else {
        const saved = await resp.json()
        console.log('✅ Saved ChatMessage to Base44:', saved)
      }

      // Facebook требует 200 OK
      return res.status(200).send('EVENT_RECEIVED')

    } catch (e) {
      console.error('❌ Error in handler:', e)
      return res.status(500).send('Server Error')
    }
  }

  // 3) другие методы — запрещены
  return res.status(405).send('Method Not Allowed')
}
