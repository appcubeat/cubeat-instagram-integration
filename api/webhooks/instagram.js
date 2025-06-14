export default async function handler(req, res) {
  // 1) GET — Webhook verification
  if (req.method === 'GET') {
    const challenge = req.query['hub.challenge'] || '';
    console.log('VERIFICATION GET:', req.url, '→', challenge);
    return res.status(200).send(challenge);
  }

  // 2) POST — Incoming Instagram webhook events
  if (req.method === 'POST') {
    const payload = req.body;
    console.log('INCOMING WEBHOOK:', JSON.stringify(payload));

    // Extract all changes from payload.entry[]
    const changes = (payload.entry || []).flatMap(e => e.changes || []);

    for (const ch of changes) {
      if (ch.field !== 'messages') continue;

      // Unwrap nested value.value if present
      let msg = ch.value;
      if (msg?.value) msg = msg.value;

      const sid  = msg?.sender?.id;
      const rid  = msg?.recipient?.id;
      const mid  = msg?.message?.mid;
      const text = msg?.message?.text || '';

      if (!sid || !rid || !mid) {
        console.warn('Skipping invalid payload:', JSON.stringify(msg));
        continue;
      }

      // Convert Unix seconds → milliseconds → ISO-8601 string
      const tsSec        = parseInt(msg.timestamp, 10) || Math.floor(Date.now() / 1000);
      const isoTimestamp = new Date(tsSec * 1000).toISOString();

      const record = {
        client_id:            String(rid),
        instagram_user_id:    String(sid),
        instagram_message_id: String(mid),
        direction:            'incoming',
        message_text:         text,
        timestamp:            isoTimestamp
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
          const errText = await resp.text();
          console.error('❌ Base44 returned error:', resp.status, errText);
        } else {
          console.log('✅ Saved ChatMessage to Base44:', record);
        }
      } catch (err) {
        console.error('❌ Error saving to Base44:', err);
      }
    }

    return res.status(200).send('EVENT_RECEIVED');
  }

  // 3) All other methods
  res.setHeader('Allow', ['GET','POST']);
  return res.status(405).send('Method Not Allowed');
}
