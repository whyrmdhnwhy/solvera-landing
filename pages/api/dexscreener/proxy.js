import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { query } = req.query;
  const isSearch = !!query;
  
  const cacheKey = isSearch ? `dexscreener:search:${query}` : `dexscreener:default`;

  try {
    let url = 'https://api.dexscreener.com/latest/dex/tokens/So11111111111111111111111111111111111111112'; // Default: SOL pairs
    if (isSearch) {
      url = `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`;
    }

    const response = await axios.get(url);
    const data = response.data;

    return res.status(200).json(data);
  } catch (error) {
    console.error('DexScreener proxy error:', error);
    return res.status(500).json({ error: 'Failed to fetch data from DexScreener' });
  }
}
