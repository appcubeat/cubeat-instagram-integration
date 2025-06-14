import fetch from 'node-fetch';

const INSTAGRAM_APP_ID     = process.env.INSTAGRAM_APP_ID;
const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET;
const BASE44_API_URL       = process.env.BASE44_API_URL;
const BASE44_API_TOKEN     = process.env.BASE44_API_TOKEN;

export default async function handler(req, res) {
  const { code, state } = req.query;
  if (!code) return res.status(400).send('Missing code');

  try {
    const tokenRes = await fetch(`https://graph.facebook.com/v17.0/oauth/access_token?client_id=${INSTAGRAM_APP_ID}&client_secret=${INSTAGRAM_APP_SECRET}&redirect_uri=${encodeURIComponent(process.env.VERCEL_URL + '/api/oauth/instagram/callback')}&code=${code}`);
    const { access_token } = await tokenRes.json();

    await fetch(`${BASE44_API_URL}/saveInstagramToken`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BASE44_API_TOKEN}`
      },
      body: JSON.stringify({ userId: state, access_token })
    });

    await fetch(`https://graph.facebook.com/v17.0/me/subscribed_apps?subscribed_fields=messages,messaging_postbacks,message_deliveries&messaging_product=instagram&access_token=${access_token}`, { method: 'POST' });

    return res.redirect('/success');
  } catch (e) {
    console.error(e);
    return res.status(500).send('OAuth error');
  }
}
