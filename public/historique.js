const STATUTS = { en_attente: 'En attente de paiement', payee: 'Payée' };

async function chargerHistorique() {
  const zone = document.getElementById('historique');
  if (!zone) return;
  const r = await fetch('/api/commandes');
  zone.textContent = '';
  if (!r.ok) {
    zone.textContent = 'Connectez-vous pour voir vos commandes.';
    return;
  }
  const liste = await r.json();
  if (liste.length === 0) {
    zone.textContent = 'Aucune commande pour le moment.';
    return;
  }
  for (const c of liste) {
    const d = document.createElement('div');
    d.className = 'carte';
    const t = document.createElement('strong');
    t.textContent = 'Commande n°' + c.id + ' : ' + fmt(c.total);
    const p = document.createElement('p');
    const date = new Date(c.cree_le.replace(' ', 'T') + 'Z').toLocaleString('fr-FR');
    p.textContent = date + ' - ' + (STATUTS[c.statut] || c.statut);
    d.append(t, p);
    if (c.statut === 'en_attente') {
      const b = document.createElement('button');
      b.textContent = 'Payer';
      b.addEventListener('click', async () => {
        const rr = await fetch('/api/commandes/' + c.id + '/payer', { method: 'POST' });
        const j = await rr.json().catch(() => ({}));
        if (rr.ok && j.url) {
          window.location.href = j.url;
        } else {
          p.textContent = j.erreur || 'Erreur de paiement';
        }
      });
      d.append(b);
    }
    zone.append(d);
  }
}
