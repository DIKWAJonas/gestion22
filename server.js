const express = require('express');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

const PROD = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;

if (PROD && !process.env.SESSION_SECRET) {
  console.error('SESSION_SECRET est obligatoire en production');
  process.exit(1);
}
const secret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

const app = express();
const db = new DatabaseSync('gestion22.db');

app.disable('x-powered-by');
if (PROD) app.set('trust proxy', 1);

app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'same-origin'
  });
  next();
});

app.use(express.json({ limit: '10kb' }));
app.use(session({
  name: 'g22.sid',
  secret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: PROD,
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));
app.use(express.static('public'));

const limiteur = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erreur: 'Trop de tentatives, réessayez dans 15 minutes' }
});
app.use('/api/connexion', limiteur);
app.use('/api/inscription', limiteur);

function ouvrirSession(req, res, user) {
  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ erreur: 'Erreur serveur' });
    req.session.userId = user.id;
    res.json({ id: user.id, nom: user.nom });
  });
}

app.get('/api/ping', (req, res) => {
  res.json({ message: 'Gestion22 fonctionne' });
});

app.get('/api/produits', (req, res) => {
  res.json(db.prepare('SELECT * FROM produits').all());
});

app.post('/api/inscription', (req, res) => {
  const nom = String(req.body.nom || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const mdp = String(req.body.mot_de_passe || '');
  const emailValide = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!nom || nom.length > 100 || !emailValide || email.length > 200) {
    return res.status(400).json({ erreur: 'Nom ou email invalide' });
  }
  if (mdp.length < 8 || mdp.length > 72) {
    return res.status(400).json({ erreur: 'Le mot de passe doit faire de 8 à 72 caractères' });
  }
  const hash = bcrypt.hashSync(mdp, 10);
  let id;
  try {
    const r = db.prepare('INSERT INTO users (nom, email, mot_de_passe) VALUES (?, ?, ?)').run(nom, email, hash);
    id = Number(r.lastInsertRowid);
  } catch (e) {
    return res.status(409).json({ erreur: 'Cet email est déjà utilisé' });
  }
  ouvrirSession(req, res, { id, nom });
});

app.post('/api/connexion', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const mdp = String(req.body.mot_de_passe || '');
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(mdp, user.mot_de_passe)) {
    return res.status(401).json({ erreur: 'Email ou mot de passe incorrect' });
  }
  ouvrirSession(req, res, user);
});

app.post('/api/deconnexion', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('g22.sid');
    res.json({ ok: true });
  });
});

app.get('/api/moi', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ erreur: 'Non connecté' });
  }
  const user = db.prepare('SELECT id, nom, email FROM users WHERE id = ?').get(req.session.userId);
  res.json(user);
});

require('./commandes')(app, db);
require('./paiement-simule')(app, db);
require('./paiement')(app, db);

app.use((err, req, res, next) => {
  const code = err.status === 400 ? 400 : 500;
  res.status(code).json({ erreur: code === 400 ? 'Requête invalide' : 'Erreur serveur' });
});

app.listen(PORT, () => {
  console.log('Serveur lancé sur http://localhost:' + PORT);
});
