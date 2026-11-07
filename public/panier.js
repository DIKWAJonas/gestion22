const MONNAIE = '€';
let panier = {};
const fmt = (c) => (c / 100).toFixed(2).replace('.', ',') + ' ' + MONNAIE;

function boutonAjout(p) {
  const b = document.createElement('button');
  b.textContent = 'Ajouter au panier';
  b.style.marginTop = '6px';
  b.addEventListener('click', () => {
    if (!panier[p.id]) panier[p.id] = { nom: p.nom, prix: p.prix, quantite: 0 };
    panier[p.id].quantite++;
    afficherPanier();
  });
  return b;
}

function afficherPanier() {
  const zone = document.getElementById('panier');
  zone.textContent = '';
  const ids = Object.keys(panier);
  if (ids.length === 0) {
    zone.textContent = 'Votre panier est vide.';
    return;
  }
  let total = 0;
  for (const id of ids) {
    const l = panier[id];
    total += l.prix * l.quantite;
    const ligne = document.createElement('div');
    ligne.className = 'carte';
    ligne.textContent = l.nom + ' x ' + l.quantite + ' : ' + fmt(l.prix * l.quantite) + ' ';
    const moins = document.createElement('button');
    moins.textContent = '-';
    moins.addEventListener('click', () => {
      l.quantite--;
      if (l.quantite <= 0) delete panier[id];
      afficherPanier();
    });
    ligne.append(moins);
    zone.append(ligne);
  }
  const t = document.createElement('strong');
  t.textContent = 'Total : ' + fmt(total);
  zone.append(t);
}

document.getElementById('btn-cmd').addEventListener('click', async () => {
  const info = document.getElementById('info-cmd');
  const articles = Object.keys(panier).map((id) => ({
    produit_id: Number(id),
    quantite: panier[id].quantite
  }));
  if (articles.length === 0) {
    info.textContent = 'Panier vide';
    return;
  }
  const r = await fetch('/api/commandes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ articles })
  });
  const j = await r.json().catch(() => ({}));
  if (r.ok) {
    panier = {};
    proposerPaiement(j.id);
    chargerHistorique();
    afficherPanier();
    info.textContent = 'Commande n°' + j.id + ' enregistrée : ' + fmt(j.total) + ' (en attente de paiement)';
  } else {
    info.textContent = j.erreur || 'Erreur';
  }
});

afficherPanier();

function proposerPaiement(idCmd) {
  const info = document.getElementById('info-cmd');
  const ancien = document.getElementById('btn-payer');
  if (ancien) ancien.remove();
  const b = document.createElement('button');
  b.id = 'btn-payer';
  b.textContent = 'Payer maintenant';
  b.addEventListener('click', async () => {
    const r = await fetch('/api/commandes/' + idCmd + '/payer', { method: 'POST' });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.url) {
      window.location.href = j.url;
    } else {
      info.textContent = j.erreur || 'Erreur de paiement';
    }
  });
  info.after(b);
}
