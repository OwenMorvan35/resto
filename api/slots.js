import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const toHHMM = (t) => (typeof t === 'string' ? t.slice(0,5) : String(t).slice(0,5));

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    let { date } = req.query; // "AAAA-MM-JJ" (tolère "JJ/MM/AAAA")
    if (!date) return res.status(400).json({ error: 'Paramètre ?date requis' });

    if (date.includes('/')) {
      const [d, m, y] = date.split('/');
      date = `${y}-${m}-${d}`;
    }

    const { data, error } = await supabase
      .from('reservations')
      .select('res_time')
      .eq('res_date', date);

    if (error) throw error;

    const taken = (data || []).map(r => toHHMM(r.res_time));
    return res.status(200).json({ taken });
  } catch (e) {
    console.error('[slots] error', e);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
