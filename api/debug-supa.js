// api/debug-supa.js — DIAG
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';



export default async function handler(req, res) {
  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Ne JAMAIS loguer ta clé → on vérifie juste présence et longueurs
    if (!url || !key) {
      return res.status(500).json({
        ok: false,
        hint: 'ENV manquantes',
        have_URL: !!url,
        have_SERVICE_ROLE: !!key
      });
    }

    const supabase = createClient(url, key);

    // Ping simple: liste 1 ligne si table existe
    const { data, error } = await supabase
      .from('reservations')
      .select('id')
      .limit(1);

    if (error) {
      return res.status(500).json({
        ok: false,
        hint: 'Requête Supabase KO (table/politiques ?)',
        error: error.message
      });
    }

    return res.status(200).json({
      ok: true,
      hint: 'Connexion OK',
      tableExists: Array.isArray(data)
    });
  } catch (e) {
    return res.status(500).json({ ok: false, fatal: String(e) });
  }
}
