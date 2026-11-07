module.exports = (app, db) => {
  app.post('/api/commandes', (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ erreur: 'Connectez-vous pour commander' });
    }
    const articles = Array.isArray(req.body.articles) ? req.body.articles : [];
    if (articles.length === 0) {
      return res.status(400).json({ erreur: 'Panier vide' });
    }
    try {
      const quantites = new Map();
      for (const a of articles) {
        const id = Number(a.produit_id);
        const q = Number(a.quantite);
        if (!Number.isInteger(id) || !Number.isInteger(q) || q < 1) {
          throw new Error('Article invalide');
        }
        quantites.set(id, (quantites.get(id) || 0) + q);
      }
      db.exec('BEGIN');
      let total = 0;
      const lignes = [];
      for (const [id, q] of quantites) {
        const p = db.prepare('SELECT * FROM produits WHERE id = ?').get(id);
        if (!p) throw new Error('Produit introuvable');
        if (p.stock < q) throw new Error('Stock insuffisant pour ' + p.nom);
        total += p.prix * q;
        lignes.push({ p, q });
      }
      const c = db.prepare('INSERT INTO commandes (user_id, total) VALUES (?, ?)')
        .run(req.session.userId, total);
      const idCmd = Number(c.lastInsertRowid);
      for (const { p, q } of lignes) {
        db.prepare('INSERT INTO lignes_commande (commande_id, produit_id, quantite, prix_unitaire) VALUES (?, ?, ?, ?)')
          .run(idCmd, p.id, q, p.prix);
        db.prepare('UPDATE produits SET stock = stock - ? WHERE id = ?').run(q, p.id);
      }
      db.exec('COMMIT');
      res.json({ id: idCmd, total, statut: 'en_attente' });
    } catch (e) {
      try { db.exec('ROLLBACK'); } catch (e2) {}
      res.status(400).json({ erreur: e.message });
    }
  });

  app.get('/api/commandes', (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ erreur: 'Non connecté' });
    }
    res.json(db.prepare('SELECT id, total, statut, cree_le FROM commandes WHERE user_id = ? ORDER BY id DESC').all(req.session.userId));
  });
};
