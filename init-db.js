const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('gestion22.db');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  mot_de_passe TEXT NOT NULL,
  cree_le TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS produits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL,
  description TEXT,
  prix INTEGER NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS commandes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  total INTEGER NOT NULL,
  statut TEXT NOT NULL DEFAULT 'en_attente',
  cree_le TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lignes_commande (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  commande_id INTEGER NOT NULL REFERENCES commandes(id),
  produit_id INTEGER NOT NULL REFERENCES produits(id),
  quantite INTEGER NOT NULL,
  prix_unitaire INTEGER NOT NULL
);
`);

const n = db.prepare('SELECT COUNT(*) AS n FROM produits').get().n;
if (n === 0) {
  const ins = db.prepare('INSERT INTO produits (nom, description, prix, stock) VALUES (?, ?, ?, ?)');
  ins.run('T-shirt Gestion22', 'T-shirt en coton', 1500, 50);
  ins.run('Casquette Gestion22', 'Casquette réglable', 1200, 30);
  ins.run('Mug Gestion22', 'Mug en céramique', 800, 40);
}

const produits = db.prepare('SELECT * FROM produits').all();
console.log('Base prête. Produits :');
for (const p of produits) console.log(p.id, p.nom, p.prix, p.stock);
