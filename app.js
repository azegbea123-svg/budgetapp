// app.js - fonctions partagées, remplissage catégories et affichages

// Vérifie que db est présent (firebase.js doit être chargé avant app.js)
if (typeof db === 'undefined') {
  console.warn('Firestore non initialisé. Vérifie firebase.js');
}

// ---------------------------
// Helpers : remplir selects
// ---------------------------
function fillSelectWithCategories(selectEl) {
  if (!selectEl) return;
  selectEl.innerHTML = '';
  // Option vide (si souhaité)
  const empty = document.createElement('option');
  empty.value = '';
  empty.textContent = '-- Choisir --';
  selectEl.appendChild(empty);

  if (typeof CATEGORIES === 'undefined') return;
  CATEGORIES.forEach(cat => {
    const o = document.createElement('option');
    o.value = cat;
    o.textContent = cat;
    selectEl.appendChild(o);
  });
}

// Remplit toutes les selects marquées .auto-cat
function populateAllCategorySelects() {
  document.querySelectorAll('select.auto-cat').forEach(s => fillSelectWithCategories(s));
  // aussi selects créés dynamiquement (previsionnel rows) will use same class
}

// Appel au chargement DOM
document.addEventListener('DOMContentLoaded', () => {
  populateAllCategorySelects();

  // Remplit le filtre catégorie dans history si présent
  const filterCat = document.getElementById('filterCat');
  if (filterCat && typeof CATEGORIES !== 'undefined') {
    filterCat.innerHTML = '<option value="all">Toutes catégories</option>';
    CATEGORIES.forEach(c => {
      const o = document.createElement('option'); o.value = c; o.textContent = c;
      filterCat.appendChild(o);
    });
  }

  // Si index/show transactionList exists, let realtime display handle it (handled below)
});

// ---------------------------
// PREVISIONNEL HELPERS (chargement)
// ---------------------------
async function chargerBudgetPrevisionnel(mois) {
  try {
    const snap = await db.collection("budgets_previsionnels")
      .where("mois", "==", mois)
      .limit(1)
      .get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() };
  } catch (e) {
    console.error("Erreur chargement budget prévisionnel :", e);
    return null;
  }
}

async function calculerBudgetReel(mois) {
  const debut = mois + "-01";
  const fin = mois + "-31";
  try {
    const snap = await db.collection("transactions")
      .where("date", ">=", debut)
      .where("date", "<=", fin)
      .get();
    let reel = {};
    snap.forEach(doc => {
      const t = doc.data();
      if (!reel[t.categorie]) reel[t.categorie] = 0;
      reel[t.categorie] += Number(t.montant || 0);
    });
    return reel;
  } catch (e) {
    console.error("Erreur calc reel :", e);
    return {};
  }
}

function afficherComparaison(previsionnel, reel) {
  const zone = document.getElementById("comparaison");
  if (!zone) return;
  zone.innerHTML = "";
  const cats = previsionnel.categories || {};
  Object.keys(cats).forEach(cat => {
    const prev = Number(cats[cat] || 0);
    const real = Number(reel[cat] || 0);
    const couleur = real > prev ? 'var(--danger)' : 'var(--success)';
    const etat = real > prev ? 'Dépassement' : 'OK';
    const el = document.createElement('div');
    el.style.display = 'flex';
    el.style.justifyContent = 'space-between';
    el.style.alignItems = 'center';
    el.style.padding = '8px 6px';
    el.innerHTML = `
      <div style="flex:1"><strong>${cat}</strong><div style="color:var(--muted);font-size:13px">Prévu: ${prev} FCFA</div></div>
      <div style="text-align:right;min-width:160px">
        <div style="font-weight:700">${real} FCFA</div>
        <div style="color:${couleur};font-weight:700">${etat}</div>
      </div>
    `;
    zone.appendChild(el);
  });
}

// ---------------------------
// CRUD Transactions
// ---------------------------
async function addTransaction(data) {
  try {
    await db.collection('transactions').add(data);
    console.log('Ajout OK', data);
  } catch (err) {
    console.error('Erreur ajout', err);
    throw err;
  }
}

async function updateTransaction(id, patch) {
  try {
    await db.collection('transactions').doc(id).update(patch);
    console.log('Update OK', id, patch);
  } catch (err) {
    console.error('Erreur update', err);
    throw err;
  }
}

async function deleteTransaction(id) {
  try {
    await db.collection('transactions').doc(id).delete();
    console.log('Delete OK', id);
  } catch (err) {
    console.error('Erreur delete', err);
    throw err;
  }
}

// ---------------------------
// Affichage index/dashboard realtime (si transactionList present)
// ---------------------------
document.addEventListener('DOMContentLoaded', () => {
  const list = document.getElementById('transactionList');
  if (!list) return;

  db.collection('transactions').orderBy('date', 'desc').onSnapshot(snapshot => {
    list.innerHTML = '';
    snapshot.forEach(doc => {
      const t = doc.data();
      const item = document.createElement('div');
      item.className = 'transaction';
      item.innerHTML = `
        <div class="tx-left">
          <div style="display:flex;gap:10px;align-items:center">
            <div class="badge ${t.type}">${t.type}</div>
            <strong>${t.categorie}</strong>
          </div>
          <div class="tx-meta">${t.date} · ${t.description || ''}</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <div style="text-align:right"><div style="font-weight:700">${t.montant} FCFA</div></div>
        </div>
      `;
      list.appendChild(item);
    });
  });
});
