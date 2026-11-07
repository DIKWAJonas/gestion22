const Stripe = require('stripe');

module.exports = (app, db) => {
  const cle = process.env.STRIPE_SECRET_KEY;
  const stripe = cle ? new Stripe(cle) : null;
  const DEVISE = 'eur';
  const BASE = process.env.BASE_URL || 'http://localhost:3000';

  app.post('/api/commandes/:id/payer', async (req, res) => {
    if (!stripe) return res.status(500).json({ erreur: 'Clé Stripe manquante' });
    if (!req.session.userId) return res.status(401).json({ erreur: 'Non connecté' });
    const cmd = db.prepare('SELECT * FROM commandes WHERE id = ? AND user_id = ?')
      .get(Number(req.params.id), req.session.userId);
    if (!cmd) return res.status(404).json({ erreur: 'Commande introuvable' });
    if (cmd.statut !== 'en_attente') return res.status(400).json({ erreur: 'Commande déjà traitée' });
    const lignes = db.prepare('SELECT l.quantite, l.prix_unitaire, p.nom FROM lignes_commande l JOIN produits p ON p.id = l.produit_id WHERE l.commande_id = ?').all(cmd.id);
    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: lignes.map((l) => ({
          quantity: l.quantite,
          price_data: {
            currency: DEVISE,
            unit_amount: l.prix_unitaire,
            product_data: { name: l.nom }
          }
        })),
        metadata: { commande_id: String(cmd.id) },
        success_url: BASE + '/paiement-ok.html?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: BASE + '/'
      });
      res.json({ url: session.url });
    } catch (e) {
      res.status(500).json({ erreur: 'Erreur Stripe : ' + e.message });
    }
  });

  app.get('/api/paiement/verifier', async (req, res) => {
    if (!stripe) return res.status(500).json({ erreur: 'Clé Stripe manquante' });
    if (!req.session.userId) return res.status(401).json({ erreur: 'Non connecté' });
    try {
      const s = await stripe.checkout.sessions.retrieve(String(req.query.session_id));
      const id = Number(s.metadata.commande_id);
      const cmd = db.prepare('SELECT * FROM commandes WHERE id = ? AND user_id = ?')
        .get(id, req.session.userId);
      if (!cmd) return res.status(404).json({ erreur: 'Commande introuvable' });
      if (s.payment_status === 'paid' && s.amount_total === cmd.total) {
        db.prepare("UPDATE commandes SET statut = 'payee' WHERE id = ?").run(id);
        return res.json({ paye: true, commande: id });
      }
      res.json({ paye: false, commande: id });
    } catch (e) {
      res.status(400).json({ erreur: 'Session invalide' });
    }
  });
};
