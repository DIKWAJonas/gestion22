module.exports = (app, db) => {
  if (process.env.MODE_SIMULATION !== '1') return;
  console.log('MODE SIMULATION : paiements fictifs');

  app.post('/api/commandes/:id/payer', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ erreur: 'Non connecté' });
    const cmd = db.prepare('SELECT * FROM commandes WHERE id = ? AND user_id = ?')
      .get(Number(req.params.id), req.session.userId);
    if (!cmd) return res.status(404).json({ erreur: 'Commande introuvable' });
    if (cmd.statut !== 'en_attente') return res.status(400).json({ erreur: 'Commande déjà traitée' });
    res.json({ url: '/paiement-simule.html?commande=' + cmd.id });
  });

  app.post('/api/paiement/simuler', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ erreur: 'Non connecté' });
    const id = Number(req.body.commande);
    const r = db.prepare("UPDATE commandes SET statut = 'payee' WHERE id = ? AND user_id = ? AND statut = 'en_attente'")
      .run(id, req.session.userId);
    if (r.changes === 0) return res.status(400).json({ erreur: 'Commande introuvable ou déjà traitée' });
    res.json({ paye: true, commande: id });
  });
};
