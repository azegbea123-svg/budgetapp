// previsionnel.js - gestion du formulaire prévisionnel (ajout/lignes dynamiques)

document.addEventListener('DOMContentLoaded', () => {
  const addBtn = document.getElementById('addCat');
  const zone = document.getElementById('listeCategories');

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
    zone.appendChild(div);

    fillSelectWithCategories(div.querySelector('.catSelect'));
    if (selected) div.querySelector('.catSelect').value = selected;

    div.querySelector('.removeCat').addEventListener('click', () => div.remove());
  }

  if (zone && zone.children.length === 0) createCategoryRow();

  if (addBtn) addBtn.addEventListener('click', () => createCategoryRow());

  const form = document.getElementById('budgetForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const mois = document.getElementById('mois').value;
    const budgetTotal = Number(document.getElementById('budgetTotal').value) || 0;

    const categories = {};
    zone.querySelectorAll('.catRow').forEach(r => {
      const sel = r.querySelector('.catSelect');
      const amt = Number(r.querySelector('.catMontant').value) || 0;
      if (sel && sel.value) categories[sel.value] = amt;
    });

    const data = {
      mois,
      budgetTotal,
      categories,
      updatedAt: new Date().toISOString()
    };

    try {
      const snap = await db.collection('budgets_previsionnels')
        .where('mois', '==', mois)
        .limit(1)
        .get();

      if (snap.empty) {
        data.createdAt = new Date().toISOString();
        await db.collection('budgets_previsionnels').add(data);
      } else {
        await db.collection('budgets_previsionnels')
          .doc(snap.docs[0].id)
          .update(data);
      }

      alert('Budget prévisionnel enregistré !');

      // 🔥 FIX ICI : on revient au dashboard correctement
      window.location.href = 'dashboard.html';

    } catch (err) {
      console.error('Erreur previsionnel', err);
      alert('Erreur lors de l’enregistrement');
    }
  });
});
