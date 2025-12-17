// app.js - fonctions partagées, catégories, transactions, prévisionnel (par utilisateur)

// ==========================
// Vérification Firestore
// ==========================
if (typeof db === 'undefined') {
  console.warn('Firestore non initialisé. Vérifie firebase.js');
}

// ==========================
// Helper : utilisateur courant
// ==========================
function getCurrentUser() {
  return new Promise(resolve => {
    firebase.auth().onAuthStateChanged(user => resolve(user));
  });
}

// ==========================
// Helpers : catégories
// ==========================
function fillSelectWithCategories(selectEl) {
  if (!selectEl) return;
  selectEl.innerHTML = '';

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

function populateAllCategorySelects() {
  document.querySelectorAll('select.auto-cat')
    .forEach(s => fillSelectWithCategories(s));
}

// ==========================
// DOM READY
// ==========================
document.addEventListener('DOMContentLoaded', () => {
  populateAllCategorySelects();

  const filterCat = document.getElementById('filterCat');
  if (filterCat && typeof CATEGORIES !== 'undefined') {
    filterCat.innerHTML = '<option value="all">Toutes catégories</option>';
    CATEGORIES.forEach(c => {
      const o = document.createElement('option');
      o.value = c;
      o.textContent = c;
      filterCat.appendChild(o);
    });
  }
});

// ==========================
// PREVISIONNEL
// ==========================
async function chargerBudgetPrevisionnel(mois) {
  const user = await getCurrentUser();
  if (!user) return null;

  try {
    const snap = await db.collection("budgets_previsionnels")
      .where("userId", "==", user.uid)
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
  const user = await getCurrentUser();
  if (!user) return {};

  const debut = mois + "-01";
  const fin = mois + "-31";
  let reel = {};

  try {
    const snap = await db.collection("transactions")
      .where("userId", "==", user.uid)
      .where("date", ">=", debut)
      .where("date", "<=", fin)
      .get();

    snap.forEach(doc => {
      const t = doc.data();
      reel[t.categorie] = (reel[t.categorie] || 0) + Number(t.montant || 0);
    });

    return reel;

  } catch (e) {
    console.error("Erreur calcul réel :", e);
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
    el.style.padding = '8px 6px';

    el.innerHTML = `
      <div>
        <strong>${cat}</strong>
        <div style="font-size:13px;color:var(--muted)">
          Prévu : ${prev} FCFA
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-weight:700">${real} FCFA</div>
        <div style="color:${couleur};font-weight:700">${etat}</div>
      </div>
    `;

    zone.appendChild(el);
  });
}

// ==========================
// CRUD TRANSACTIONS (LIÉES AU USER)
// ==========================
async function addTransaction(data) {
  const user = firebase.auth().currentUser;
  if (!user) throw new Error("Utilisateur non connecté");

  await db.collection('transactions').add({
    ...data,
    userId: user.uid,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

async function updateTransaction(id, patch) {
  const user = firebase.auth().currentUser;
  if (!user) throw new Error("Utilisateur non connecté");

  await db.collection('transactions').doc(id).update(patch);
}

async function deleteTransaction(id) {
  const user = firebase.auth().currentUser;
  if (!user) throw new Error("Utilisateur non connecté");

  await db.collection('transactions').doc(id).delete();
}

// ==========================
// DASHBOARD / INDEX (REALTIME)
// ==========================
firebase.auth().onAuthStateChanged(user => {
  if (!user) return;

  const list = document.getElementById('transactionList');
  if (!list) return;

  const user = firebase.auth().currentUser;
  if (!user) return;


  db.collection('transactions')
    .where('userId', '==', user.uid)
    .orderBy('date', 'desc')
    .onSnapshot(snapshot => {

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
          <div style="font-weight:700">${t.montant} FCFA</div>
        `;

        list.appendChild(item);
      });
    });
});
