import { requestSyraSignal } from '../../../lib/syraPayment';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Attempt to request the signal from Syra
    // This expects to receive a 402 Payment Required response from Syra
    const paymentDetails = await requestSyraSignal();

    // We pass the 402 Payment details to the frontend
    // so the frontend can prompt the user to pay using a Web3 wallet.
    return res.status(200).json(paymentDetails.accepts[0]); 
  } catch (error) {
    console.error('API Payment Signal error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
