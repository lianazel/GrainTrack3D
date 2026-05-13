export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const key = process.env.AIS_API_KEY
  if (!key) {
    return res.status(500).json({ error: 'Server misconfiguration' })
  }

  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json({ key })
}
