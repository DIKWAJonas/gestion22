const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('gestion22.db');
db.exec('BEGIN');
const lignes = db.prepare("SELECT l.produit_id, l.quantite FROM lignes_commande l JOIN commandes c ON c.id = l.commande_id WHERE c.statut = 'en_attente'").all();
for (const l of lignes) {
  db.prepare('UPDATE produits SET stock = stock + ? WHERE id = ?').run(l.quantite, l.produit_id);
}
db.exec("DELETE FROM lignes_commande WHERE commande_id IN (SELECT id FROM commandes WHERE statut = 'en_attente')");
db.exec("DELETE FROM commandes WHERE statut = 'en_attente'");
db.exec('COMMIT');
console.log(db.prepare('SELECT id, nom, stock FROM produits').all());
console.log(db.prepare('SELECT id, total, statut FROM commandes').all());
