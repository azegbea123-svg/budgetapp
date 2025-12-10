// previsionnel.js - total automatique + chargement si existant
document.addEventListener('DOMContentLoaded', () => {
  const addBtn = document.getElementById('addCat');
  const zone = document.getElementById('listeCategories');
  const affTotal = document.getElementById('affTotal');
  const moisInput = document.getElementById('mois');

  // calcule et affiche le total à partir des inputs .catMontant
  function updateTotal() {
    let total = 0;
    zone.querySelectorAll('.catMontant').forEach(inp => {
      total += Number(inp.value) || 0;
    });
    affTotal.textContent = total.toLocaleString() + ' FCFA';
    return total;
  }

  // crée une ligne catégorie (select auto-cat + montant + bouton suppr)
  function createCategoryRow(selected = '', amount = '') {
    const div = document.createElement('div');
    div.className = 'catRow';
    div.style.display = 'flex';
    div.style.gap = '10px';
    div.style.marginBottom = '10px';

    div.innerHTML = `
      <select class="catSelect auto-cat" style="flex:1;padding:10px;border-radius:8px;border:1px solid #e5e7eb"></select>
      <input type="number" class="catMontant" placeholder="Montant prévu" value="${amount}" style="width:160px;padding:10px;border-radius:8px;border:1px solid #e5e7eb;">
      <button type="button" class="removeCat btn-ghost" style="padding:6px 10px;border-radius:8px">Suppr</button>
    `;

    // append then fill select (fillSelectWithCategories from app.js)
    zone.appendChild(div);
    const sel = div.querySelector('.catSelect');
    const inp = div.querySelector('.catMontant');

    // fill categories list (app.js must provide fillSelectWithCategories)
    if (typeof fillSelectWithCategories === 'function') {
      fillSelectWithCategories(sel);
    } else if (typeof CATEGORIES !== 'undefined') {
      // fallback: populate directly from CATEGORIES
      sel.innerHTML = '<option value="">-- Choisir --</option>';
      CATEGORIES.forEach(c => {
        const o = document.createElement('option');
        o.value = c; o.textContent = c;
        sel.appendChild(o);
      });
    }

    if (selected) sel.value = selected;

    // attach listeners
    inp.addEventListener('input', updateTotal);
    div.querySelector('.removeCat').addEventListener('click', () => {
      div.remove();
      updateTotal();
    });

    // update display
    updateTotal();
    return div;
  }

  // clear rows
  function clearRows() {
    zone.innerHTML = '';
    updateTotal();
  }

  // charge un budget prévisionnel existant pour le mois (utilise chargerBudgetPrevisionnel dans app.js)
  async function loadPrevisionnelFor(mois) {
    if (!mois) return;
    // show loading hint
    zone.innerHTML = '<p style="color:var(--muted)">Chargement...</p>';
    try {
      const previ = (typeof chargerBudgetPrevisionnel === 'function') ? await chargerBudgetPrevisionnel(mois) : null;
      clearRows();
      if (!previ || !previ.categories || Object.keys(previ.categories).length === 0) {
        // no previsionnel -> one empty row
        createCategoryRow();
        return;
      }
      // populate rows from previ.categories (object: {catName: amount})
      Object.entries(previ.categories).forEach(([cat, amt]) => {
        createCategoryRow(cat, amt);
      });
      updateTotal();
    } catch (err) {
      console.error('Erreur chargement prévisionnel', err);
      clearRows();
      createCategoryRow();
    }
  }

  // initial: create one empty row
  if (zone && zone.children.length === 0) createCategoryRow();

  // when mois changes, try to load existing previsionnel
  if (moisInput) {
    moisInput.addEventListener('change', () => {
      const mois = moisInput.value;
      if (!mois) return;
      loadPrevisionnelFor(mois);
    });

    // optional: pre-fill with current month
    if (!moisInput.value) {
      moisInput.value = new Date().toISOString().slice(0,7);
    }
    // load on start
    loadPrevisionnelFor(moisInput.value);
  }

  // add new blank row
  if (addBtn) addBtn.addEventListener('click', () => createCategoryRow());

  // submit: calc total from categories and save to Firestore
  const form = document.getElementById('budgetForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const mois = moisInput.value;
    if (!mois) {
      alert('Choisissez le mois.');
      return;
    }

    // build categories object and compute budgetTotal
    const categories = {};
    let budgetTotal = 0;
    zone.querySelectorAll('.catRow').forEach(row => {
      const sel = row.querySelector('.catSelect');
      const amt = Number(row.querySelector('.catMontant').value) || 0;
      if (sel && sel.value) {
        categories[sel.value] = amt;
        budgetTotal += amt;
      }
    });

    const data = {
      mois,
      budgetTotal,
      categories,
      updatedAt: new Date().toISOString()
    };

    try {
      const snap = await db.collection('budgets_previsionnels').where('mois', '==', mois).limit(1).get();
      if (snap.empty) {
        data.createdAt = new Date().toISOString();
        await db.collection('budgets_previsionnels').add(data);
      } else {
        await db.collection('budgets_previsionnels').doc(snap.docs[0].id).update(data);
      }

      alert('Budget prévisionnel enregistré !');
      window.location.href = 'dashboard.html';
    } catch (err) {
      console.error('Erreur previsionnel', err);
      alert('Erreur lors de l’enregistrement');
    }
  });
});
