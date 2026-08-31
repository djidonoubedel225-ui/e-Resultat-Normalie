// --- CONFIGURATION SUPABASE ---
const SUPABASE_URL = 'https://ecouwdvycrfrbljwoxwb.supabase.co';          
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjb3V3ZHZ5Y3JmcmJsandveHdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxMDI1MjEsImV4cCI6MjEwMzY3ODUyMX0.su8A21HqeHdLCxVI6f94aTruboQ8m8AIetya0KDQcGY'; 

let _supabase = null;
try {
  if (typeof supabase !== 'undefined') {
    _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } else {
    console.error("Le SDK Supabase n'est pas chargé.");
  }
} catch (e) {
  console.error("Erreur lors de l'initialisation de Supabase :", e);
}

// Clé secrète administrateur
const CLE_ADMIN_SECRETE = "Bedel"; 
let currentMode = 'student';

// Structure de données globale par filière
let donneesActuelles = {
  structureUEParNiveau: {
    "Licence 1": { "Semestre 1": [], "Semestre 2": [] },
    "Licence 2": { "Semestre 1": [], "Semestre 2": [] },
    "Licence 3": { "Semestre 1": [], "Semestre 2": [] }
  },
  etudiants: []
};

// --- 1. GESTION DES MODES (ÉTUDIANT / ADMIN) ---
const btnModeStudent = document.getElementById('btnModeStudent');
if (btnModeStudent) {
  btnModeStudent.addEventListener('click', (e) => {
    currentMode = 'student';
    e.target.classList.add('active-tab');
    
    const btnAdmin = document.getElementById('btnAdminMode');
    if (btnAdmin) btnAdmin.classList.remove('active-tab');
    
    document.getElementById('actionBtn').textContent = "Consulter le bulletin";
    document.getElementById('adminPanelContainer').style.display = 'none';
    document.getElementById('saveChangesBtn').style.display = 'none';
    document.getElementById('bulletinContainer').style.display = 'none';
  });
}

const btnAdminMode = document.getElementById('btnAdminMode');
if (btnAdminMode) {
  btnAdminMode.addEventListener('click', async (e) => {
    try {
      const saisieCle = prompt("Veuillez entrer la clé d'accès à l'espace administrateur :");
      if (saisieCle === null) return; 

      if (saisieCle === CLE_ADMIN_SECRETE) {
        currentMode = 'admin';
        e.target.classList.add('active-tab');
        
        if (btnModeStudent) btnModeStudent.classList.remove('active-tab');
        
        document.getElementById('actionBtn').textContent = "Charger les notes de l'étudiant";
        document.getElementById('adminPanelContainer').style.display = 'block';
        document.getElementById('saveChangesBtn').style.display = 'block';
        document.getElementById('bulletinContainer').style.display = 'none';
        
        await chargerDonneesDepuisSupabase();
        chargerInterfaceAdmin();
        
        alert("Accès autorisé. Bienvenue dans l'espace administrateur.");
      } else {
        alert("Clé d'accès incorrecte. Accès refusé.");
        if (btnModeStudent) btnModeStudent.classList.add('active-tab');
        e.target.classList.remove('active-tab');
      }
    } catch (err) {
      console.error("Erreur mode admin :", err);
    }
  });
}

// Changements de filière, niveau ou semestre
['filiereSelect', 'anneeSelect', 'semestreSelect'].forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('change', async () => {
      await chargerDonneesDepuisSupabase();
      if (currentMode === 'admin') {
        chargerInterfaceAdmin();
      }
      document.getElementById('bulletinContainer').style.display = 'none';
    });
  }
});

// --- 2. SYNCHRONISATION SUPABASE (GLOBAL PAR FILIÈRE) ---
async function chargerDonneesDepuisSupabase() {
  if (!_supabase) return;

  const filiere = document.getElementById('filiereSelect').value;

  try {
    const { data, error } = await _supabase
      .from('academic_data')
      .select('content')
      .eq('filiere', filiere)
      .maybeSingle();

    if (error || !data || !data.content) {
      donneesActuelles = {
        structureUEParNiveau: {
          "Licence 1": { "Semestre 1": [], "Semestre 2": [] },
          "Licence 2": { "Semestre 1": [], "Semestre 2": [] },
          "Licence 3": { "Semestre 1": [], "Semestre 2": [] }
        },
        etudiants: []
      };
    } else {
      donneesActuelles = data.content;
      if (!donneesActuelles.structureUEParNiveau) {
        donneesActuelles.structureUEParNiveau = {
          "Licence 1": { "Semestre 1": [], "Semestre 2": [] },
          "Licence 2": { "Semestre 1": [], "Semestre 2": [] },
          "Licence 3": { "Semestre 1": [], "Semestre 2": [] }
        };
      }
      if (!donneesActuelles.etudiants) donneesActuelles.etudiants = [];
    }
  } catch (err) {
    console.error("Erreur de chargement :", err);
  }
}

window.sauvegarderDonneesVersSupabase = async function() {
  if (currentMode === 'admin') {
    capturerDonneesBuilderEnCours();
  }
  
  if (!_supabase) {
    alert("Erreur : Connexion à Supabase non initialisée.");
    return;
  }

  const filiere = document.getElementById('filiereSelect').value;

  const payload = {
    filiere: filiere,
    content: donneesActuelles
  };

  try {
    const { error } = await _supabase
      .from('academic_data')
      .upsert(payload, { onConflict: 'filiere' });

    if (error) {
      alert("Erreur lors de la synchronisation en ligne : " + error.message);
    } else {
      alert("Données enregistrées en ligne avec succès pour toute la filière !");
    }
  } catch (err) {
    alert("Une erreur technique est survenue lors de l'enregistrement.");
  }
};

// --- 3. GESTION DES PROFILS ÉTUDIANTS ---
const addStudentBtn = document.getElementById('addStudentBtn');
if (addStudentBtn) {
  addStudentBtn.addEventListener('click', async () => {
    const matriculeInput = document.getElementById('newMatricule');
    const nomInput = document.getElementById('newNom');
    
    if (!matriculeInput || !nomInput) return;

    const matricule = matriculeInput.value.trim();
    const nom = nomInput.value.trim();

    if (!matricule || !nom) {
      alert("Veuillez saisir le matricule et le nom de l'étudiant.");
      return;
    }

    if (donneesActuelles.etudiants.some(e => e.matricule.toLowerCase() === matricule.toLowerCase())) {
      alert("Un étudiant avec ce matricule existe déjà dans cette filière.");
      return;
    }

    donneesActuelles.etudiants.push({
      matricule,
      nom,
      notes: {
        "Licence 1": { "Semestre 1": {}, "Semestre 2": {} },
        "Licence 2": { "Semestre 1": {}, "Semestre 2": {} },
        "Licence 3": { "Semestre 1": {}, "Semestre 2": {} }
      }
    });
    
    await sauvegarderDonneesVersSupabase();

    matriculeInput.value = '';
    nomInput.value = '';
    chargerListeEtudiantsAdmin();
  });
}

function chargerListeEtudiantsAdmin() {
  const listContainer = document.getElementById('adminStudentsList');
  if (!listContainer) return;
  
  listContainer.innerHTML = '';

  if (donneesActuelles.etudiants.length === 0) {
    listContainer.innerHTML = `<span style="font-size:0.85rem; color:var(--text-muted);">Aucun étudiant enregistré dans cette filière.</span>`;
    return;
  }

  donneesActuelles.etudiants.forEach((etudiant, index) => {
    const item = document.createElement('div');
    item.className = 'student-item-badge';
    item.innerHTML = `
      <span><strong>${etudiant.matricule}</strong> - ${etudiant.nom}</span>
      <button type="button" class="btn-danger" onclick="supprimerEtudiant(${index})">Supprimer</button>
    `;
    listContainer.appendChild(item);
  });
}

window.supprimerEtudiant = async function(index) {
  donneesActuelles.etudiants.splice(index, 1);
  await sauvegarderDonneesVersSupabase();
  chargerListeEtudiantsAdmin();
};

// --- 4. CONFIGURATION DE LA MAQUETTE PÉDAGOGIQUE ---
function chargerInterfaceAdmin() {
  chargerInterfaceBuilder();
  chargerListeEtudiantsAdmin();
}

function chargerInterfaceBuilder() {
  const container = document.getElementById('ueBuilderList');
  if (!container) return;
  
  container.innerHTML = '';

  const annee = document.getElementById('anneeSelect').value;
  const semestre = document.getElementById('semestreSelect').value;

  if (!donneesActuelles.structureUEParNiveau[annee]) {
    donneesActuelles.structureUEParNiveau[annee] = { "Semestre 1": [], "Semestre 2": [] };
  }
  if (!donneesActuelles.structureUEParNiveau[annee][semestre]) {
    donneesActuelles.structureUEParNiveau[annee][semestre] = [];
  }

  const uesActuelles = donneesActuelles.structureUEParNiveau[annee][semestre];

  uesActuelles.forEach((ue, ueIndex) => {
    ajouterLigneUEBuilder(ue, ueIndex);
  });
}

window.ajouterUE = function() {
  const annee = document.getElementById('anneeSelect').value;
  const semestre = document.getElementById('semestreSelect').value;

  donneesActuelles.structureUEParNiveau[annee][semestre].push({
    nomUE: `UE${donneesActuelles.structureUEParNiveau[annee][semestre].length + 1}`,
    libelle: "",
    credit: 6,
    ecs: []
  });
  chargerInterfaceBuilder();
};

function ajouterLigneUEBuilder(ueData, ueIndex) {
  const container = document.getElementById('ueBuilderList');
  if (!container) return;
  
  const card = document.createElement('div');
  card.className = 'ue-builder-card';

  let ecsHtml = '';
  ueData.ecs.forEach((ec, ecIndex) => {
    ecsHtml += `
      <div class="ec-builder-row">
        <input type="text" class="ec-code" placeholder="Code EC (ex: EC1)" value="${ec.nom}">
        <input type="text" class="ec-label" placeholder="Libellé de l'élément constitutif" value="${ec.label}">
        <button type="button" class="btn-danger" onclick="supprimerEC(${ueIndex}, ${ecIndex})">X</button>
      </div>
    `;
  });

  card.innerHTML = `
    <div class="ue-builder-header">
      <input type="text" class="ue-code" placeholder="Nom UE" value="${ueData.nomUE}" style="width: 90px;">
      <input type="text" class="ue-libelle" placeholder="Libellé de l'UE" value="${ueData.libelle}" style="flex:2;">
      <input type="number" class="ue-credit" placeholder="Crédits" value="${ueData.credit}" min="1" max="30" style="width: 90px;">
      <button type="button" class="btn-secondary" onclick="ajouterEC(${ueIndex})">+ EC</button>
      <button type="button" class="btn-danger" onclick="supprimerUE(${ueIndex})">Supprimer UE</button>
    </div>
    <div class="ecs-container">${ecsHtml}</div>
  `;
  container.appendChild(card);
}

window.ajouterEC = function(ueIndex) {
  capturerDonneesBuilderEnCours();
  const annee = document.getElementById('anneeSelect').value;
  const semestre = document.getElementById('semestreSelect').value;
  donneesActuelles.structureUEParNiveau[annee][semestre][ueIndex].ecs.push({ nom: "", label: "" });
  chargerInterfaceBuilder();
};

window.supprimerUE = function(ueIndex) {
  capturerDonneesBuilderEnCours();
  const annee = document.getElementById('anneeSelect').value;
  const semestre = document.getElementById('semestreSelect').value;
  donneesActuelles.structureUEParNiveau[annee][semestre].splice(ueIndex, 1);
  chargerInterfaceBuilder();
};

window.supprimerEC = function(ueIndex, ecIndex) {
  capturerDonneesBuilderEnCours();
  const annee = document.getElementById('anneeSelect').value;
  const semestre = document.getElementById('semestreSelect').value;
  donneesActuelles.structureUEParNiveau[annee][semestre][ueIndex].ecs.splice(ecIndex, 1);
  chargerInterfaceBuilder();
};

function capturerDonneesBuilderEnCours() {
  const cards = document.querySelectorAll('.ue-builder-card');
  let nouvelleStructure = [];

  cards.forEach(card => {
    const nomUEInput = card.querySelector('.ue-code');
    const libelleInput = card.querySelector('.ue-libelle');
    const creditInput = card.querySelector('.ue-credit');

    const nomUE = nomUEInput ? nomUEInput.value.trim() : "";
    const libelle = libelleInput ? libelleInput.value.trim() : "";
    const credit = creditInput ? parseInt(creditInput.value) || 0 : 0;

    let ecs = [];
    card.querySelectorAll('.ec-builder-row').forEach(row => {
      const codeInput = row.querySelector('.ec-code');
      const labelInput = row.querySelector('.ec-label');
      const nom = codeInput ? codeInput.value.trim() : "";
      const label = labelInput ? labelInput.value.trim() : "";
      
      if(nom || label) {
        ecs.push({ nom, label });
      }
    });

    nouvelleStructure.push({ nomUE, libelle, credit, ecs });
  });

  const annee = document.getElementById('anneeSelect').value;
  const semestre = document.getElementById('semestreSelect').value;
  if (!donneesActuelles.structureUEParNiveau[annee]) donneesActuelles.structureUEParNiveau[annee] = {};
  donneesActuelles.structureUEParNiveau[annee][semestre] = nouvelleStructure;
}

// --- 5. CONSULTATION ET SAISIE DES NOTES ---
const actionBtn = document.getElementById('actionBtn');
if (actionBtn) {
  actionBtn.addEventListener('click', async () => {
    const matriculeInput = document.getElementById('matriculeInput');
    if (!matriculeInput) return;
    
    const matricule = matriculeInput.value.trim();
    if(!matricule) {
      alert("Veuillez entrer un numéro de matricule.");
      return;
    }

    await chargerDonneesDepuisSupabase();

    let etudiant = donneesActuelles.etudiants.find(e => e.matricule.toLowerCase() === matricule.toLowerCase());
    if (!etudiant) {
      alert("Aucun étudiant trouvé avec ce matricule dans cette filière. Veuillez l'inscrire d'abord dans l'espace administration.");
      return;
    }

    const anneeKey = document.getElementById('anneeSelect').value;
    const semestreKey = document.getElementById('semestreSelect').value;

    const structureSemestre = donneesActuelles.structureUEParNiveau?.[anneeKey]?.[semestreKey] || [];
    if(structureSemestre.length === 0) {
      alert(`Aucune maquette pédagogique configurée pour ${anneeKey} - ${semestreKey}.`);
      return;
    }

    const filiereSelect = document.getElementById('filiereSelect');
    const filiereTexte = filiereSelect ? filiereSelect.options[filiereSelect.selectedIndex].text : "";

    afficherBulletin(filiereTexte, anneeKey, semestreKey, structureSemestre, etudiant);
  });
}

function afficherBulletin(nomFiliere, annee, semestre, structureUE, etudiant) {
  document.getElementById('resFiliere').textContent = nomFiliere;
  document.getElementById('resNiveau').textContent = annee;
  document.getElementById('resSemestre').textContent = semestre;
  document.getElementById('resMatricule').textContent = etudiant.matricule;
  document.getElementById('resNom').textContent = etudiant.nom;
  
  let container = document.getElementById('uesDynamicContainer');
  if (!container) return;
  
  let tableHTML = `
    <div class="table-responsive">
      <table class="academic-table">
        <thead>
          <tr>
            <th>Unité d'Enseignement (UE) / Élément Constitutif (EC)</th>
            <th class="text-center">Crédits</th>
            <th class="text-center">Moyenne EC</th>
            <th class="text-center">Moyenne UE</th>
            <th class="text-center">Statut</th>
          </tr>
        </thead>
        <tbody>
  `;

  let totalCreditsAcquired = 0;
  let totalWeightedScores = 0;
  const totalSemestreCredits = 30;

  if (!etudiant.notes) etudiant.notes = {};
  if (!etudiant.notes[annee]) etudiant.notes[annee] = {};
  if (!etudiant.notes[annee][semestre]) etudiant.notes[annee][semestre] = {};
  const notesSemestre = etudiant.notes[annee][semestre];

  structureUE.forEach(ue => {
    let sommeNotesUE = 0;
    let ecsRowsHTML = "";

    ue.ecs.forEach((ec, index) => {
      let noteActuelle = notesSemestre[ec.nom] !== undefined ? notesSemestre[ec.nom] : 0;
      sommeNotesUE += noteActuelle;
      let ecNum = index + 1;

      if (currentMode === 'admin') {
        ecsRowsHTML += `
          <tr class="ec-row">
            <td>- ${ec.label || ec.nom} (EC ${ecNum})</td>
            <td class="text-center"></td>
            <td class="text-center">
              <input type="number" step="0.01" min="0" max="20" class="input-note" data-ec="${ec.nom}" value="${noteActuelle}">
            </td>
            <td></td>
            <td></td>
          </tr>`;
      } else {
        ecsRowsHTML += `
          <tr class="ec-row">
            <td>- ${ec.label || ec.nom} (EC ${ecNum})</td>
            <td class="text-center"></td>
            <td class="text-center">${noteActuelle.toFixed(2)}</td>
            <td></td>
            <td></td>
          </tr>`;
      }
    });

    let moyenneUE = ue.ecs.length > 0 ? sommeNotesUE / ue.ecs.length : 0;
    let estValide = moyenneUE >= 10;

    if (estValide) totalCreditsAcquired += ue.credit;
    totalWeightedScores += moyenneUE * ue.credit;

    let statutV_NV = estValide ? "V" : "NV";
    let statusClass = estValide ? "status-v" : "status-nv";

    tableHTML += `
      <tr class="ue-row-header">
        <td>${ue.nomUE} : ${ue.libelle}</td>
        <td class="text-center">${ue.credit}</td>
        <td></td>
        <td class="text-center">${moyenneUE.toFixed(2)}</td>
        <td class="text-center"><span class="${statusClass}">${statutV_NV}</span></td>
      </tr>
      ${ecsRowsHTML}
    `;
  });

  tableHTML += `</tbody></table></div>`;
  container.innerHTML = tableHTML;

  let moyenneSemestrielle = totalWeightedScores / totalSemestreCredits;
  let pourcentage = (totalCreditsAcquired / totalSemestreCredits) * 100;

  // --- STATUT GLOBAL AVEC LE NOUVEAU STYLE (MAJUSCULES, CADRE VERT/ROUGE) ---
  let statutGlobalText = "NON VALIDÉ";
  let statutClassStyle = "status-non-valide";

  if (totalCreditsAcquired === 30 && moyenneSemestrielle >= 10) {
    statutGlobalText = "VALIDÉ";
    statutClassStyle = "status-valide";
  } else if (totalCreditsAcquired >= 24) {
    statutGlobalText = "VALIDÉ + R";
    statutClassStyle = "status-valide";
  } else {
    statutGlobalText = "NON VALIDÉ";
    statutClassStyle = "status-non-valide";
  }

  document.getElementById('resCredits').textContent = totalCreditsAcquired;
  document.getElementById('resPercentage').textContent = pourcentage.toFixed(1) + "%";
  document.getElementById('resSemestreAvg').textContent = moyenneSemestrielle.toFixed(2) + "/20";
  
  const globalStatusEl = document.getElementById('resGlobalStatus');
  globalStatusEl.textContent = statutGlobalText;
  globalStatusEl.className = statutClassStyle;

  document.getElementById('bulletinContainer').style.display = 'block';
}

const saveChangesBtn = document.getElementById('saveChangesBtn');
if (saveChangesBtn) {
  saveChangesBtn.addEventListener('click', async () => {
    const resMatricule = document.getElementById('resMatricule');
    if (!resMatricule) return;
    
    const matricule = resMatricule.textContent;
    let etudiant = donneesActuelles.etudiants.find(e => e.matricule.toLowerCase() === matricule.toLowerCase());

    if (etudiant) {
      const anneeKey = document.getElementById('anneeSelect').value;
      const semestreKey = document.getElementById('semestreSelect').value;

      if (!etudiant.notes) etudiant.notes = {};
      if (!etudiant.notes[anneeKey]) etudiant.notes[anneeKey] = {};
      if (!etudiant.notes[anneeKey][semestreKey]) etudiant.notes[anneeKey][semestreKey] = {};
      
      document.querySelectorAll('.input-note').forEach(input => {
        let ecNom = input.getAttribute('data-ec');
        etudiant.notes[anneeKey][semestreKey][ecNom] = parseFloat(input.value) || 0;
      });

      await sauvegarderDonneesVersSupabase();
      
      const filiereSelect = document.getElementById('filiereSelect');
      const filiereTexte = filiereSelect ? filiereSelect.options[filiereSelect.selectedIndex].text : "";
      const structureSemestre = donneesActuelles.structureUEParNiveau[anneeKey][semestreKey];
      
      afficherBulletin(filiereTexte, anneeKey, semestreKey, structureSemestre, etudiant);
    }
  });
}
