const fs   = require('fs')
const path = require('path')

export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const key = req.headers['x-admin-key']
  if (!process.env.ADMIN_SECRET_KEY || key !== process.env.ADMIN_SECRET_KEY) {
    return res.status(401).json({ error: 'Unauthorized.' })
  }

  try {
    const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'lib', 'blacklists.json'), 'utf8'))
    return res.status(200).json(data)
  } catch {
    return res.status(500).json({ error: 'Could not read blacklists.' })
  }
}
