import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// --- Config transport mail ---
// Ici avec Gmail (pense à activer "mot de passe d’application" dans ton compte Google)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER, // ton adresse gmail
    pass: process.env.MAIL_PASS  // mot de passe d’app spécifique
  }
});

async function sendConfirmationMail({ to, name, date, time, guests }) {
  const mailOptions = {
    from: `"La Dolce Vita" <${process.env.MAIL_USER}>`,
    to,
    subject: "Confirmation de réservation – La Dolce Vita",
    html: `
      <h2>Merci ${name} !</h2>
      <p>Votre réservation a bien été enregistrée :</p>
      <ul>
        <li><strong>Date :</strong> ${date}</li>
        <li><strong>Heure :</strong> ${time}</li>
        <li><strong>Personnes :</strong> ${guests}</li>
      </ul>
      <p>Nous avons hâte de vous accueillir 🍝🍷</p>
      <p style="font-size:12px;color:#999">Restaurant La Dolce Vita</p>
    `
  };

  return transporter.sendMail(mailOptions);
}

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); }
  catch { return {}; }
}

export default async function handler(req, res) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = await readJson(req);
    const { name, phone, email, guests, date, time, notes } = body || {};
    if (!name || !phone || !guests || !date || !time) {
      return res.status(400).json({ error: 'Champs requis manquants.' });
    }

    const [d, m, y] = String(date).split('/');
    if (!y || !m || !d) return res.status(400).json({ error: 'Format de date invalide.' });
    const res_date = `${y}-${m}-${d}`;
    const res_time = (time || '').slice(0,5);

    const { data, error } = await supabase
      .from('reservations')
      .insert({
        name,
        phone,
        email: email || null,
        guests: Number(guests),
        res_date,
        res_time,
        notes: notes || null
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505' || /duplicate key/i.test(error.message)) {
        return res.status(409).json({ error: 'Ce créneau est déjà réservé.' });
      }
      throw error;
    }

    // --- Envoi du mail ---
    if (email) {
      await sendConfirmationMail({
        to: email,
        name,
        date,
        time,
        guests
      }).catch(err => console.error("Erreur envoi mail:", err));
    }

    return res.status(201).json({ ok: true, reservation: data });
  } catch (e) {
    console.error('[reserve] error', e);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
}
