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

let currentMode = 'student';

// Structure de données globale incluant le verrou de publication et le mode rattrapage par UE
let donneesActuelles = {
  structureUEParNiveau: {
    "BAPES 1": { "Semestre 1": [], "Semestre 2": [] },
    "BAPES 2": { "Semestre 3": [], "Semestre 4": [] },
    "BAPES 3": { "Semestre 5": [], "Semestre 6": [] }
  },
  publicationSemestres: {
    "BAPES 1": { "Semestre 1": false, "Semestre 2": false },
    "BAPES 2": { "Semestre 3": false, "Semestre 4": false },
    "BAPES 3": { "Semestre 5": false, "Semestre 6": false }
  },
  etudiants: []
};

// Fonction utilitaire pour générer la clé unique par Filière et par Promotion
function obtenirCleSupabase() {
  const filiere = document.getElementById('filiereSelect')?.value || 'Allemand';
  const promotion = document.getElementById('promotionSelect')?.value || '17ème Promotion';
  return `${filiere} - ${promotion}`;
}

// Fonction utilitaire pour afficher les erreurs sans alert()
function afficherErreurMatricule(message) {
  const messageBox = document.getElementById('messageErreur');
  if (messageBox) {
    if (message) {
      messageBox.textContent = message;
      messageBox.style.display = 'block';
    } else {
      messageBox.textContent = '';
      messageBox.style.display = 'none';
    }
  }
}

// --- INITIALISATION AU CHARGEMENT DE LA PAGE (Avec vérification de session persistante) ---
window.addEventListener('DOMContentLoaded', async () => {
  if (typeof mettreAJourSemestres === 'function') {
    mettreAJourSemestres();
  }

  // Vérifie si une session admin est déjà active dans le stockage local du navigateur
  if (_supabase) {
    const { data: { session } } = await _supabase.auth.getSession();
    if (session) {
      basculerModeAdminReussi();
    }
  }
});

// --- 1. GESTION DES MODES (ÉTUDIANT / ADMIN) ---
const btnModeStudent = document.getElementById('btnModeStudent');
if (btnModeStudent) {
  btnModeStudent.addEventListener('click', (e) => {
    currentMode = 'student';
    e.target.classList.add('active-tab');
    
    const btnAdmin = document.getElementById('btnAdminMode');
    if (btnAdmin) btnAdmin.classList.remove('active-tab');
    
    document.getElementById('actionBtn').textContent = "Accédez à vos résultats";
    document.getElementById('adminPanelContainer').style.display = 'none';
    document.getElementById('saveChangesBtn').style.display = 'none';
    document.getElementById('bulletinContainer').style.display = 'none';
    afficherErreurMatricule(''); 
  });
}

const btnAdminMode = document.getElementById('btnAdminMode');
const adminModal = document.getElementById('adminModal');
const adminEmailInput = document.getElementById('adminEmailInput');
const adminKeyInput = document.getElementById('adminKeyInput');
const adminModalError = document.getElementById('adminModalError');
const adminModalCancel = document.getElementById('adminModalCancel');
const adminModalSubmit = document.getElementById('adminModalSubmit');

if (btnAdminMode && adminModal) {
  btnAdminMode.addEventListener('click', async () => {
    // Si déjà connecté, un clic sur le bouton Admin réaffiche simplement le panneau sans redemander le mot de passe
    if (_supabase) {
      const { data: { session } } = await _supabase.auth.getSession();
      if (session) {
        basculerModeAdminReussi();
        return;
      }
    }

    adminModal.style.display = 'flex';
    if (adminEmailInput && !adminEmailInput.value) adminEmailInput.value = "admin@bapes.bj";
    if (adminKeyInput) adminKeyInput.value = '';
    if (adminModalError) adminModalError.style.display = 'none';
    if (adminEmailInput) {
      adminEmailInput.focus();
    } else if (adminKeyInput) {
      adminKeyInput.focus();
    }
  });
}

if (adminModalCancel) {
  adminModalCancel.addEventListener('click', () => {
    adminModal.style.display = 'none';
    if (currentMode !== 'admin') {
      if (btnModeStudent) btnModeStudent.classList.add('active-tab');
      if (btnAdminMode) btnAdminMode.classList.remove('active-tab');
    }
  });
}

async function executerConnexionAdmin() {
  try {
    const emailAdmin = adminEmailInput ? adminEmailInput.value.trim() : "admin@bapes.bj";
    const passwordAdmin = adminKeyInput ? adminKeyInput.value.trim() : "";

    const { data, error } = await _supabase.auth.signInWithPassword({
      email: emailAdmin,
      password: passwordAdmin,
    });

    if (error || !data.session) {
      if (adminModalError) {
        adminModalError.textContent = "Identifiants administrateur incorrects !";
        adminModalError.style.display = 'block';
      }
      if (adminKeyInput) adminKeyInput.focus();
    } else {
      basculerModeAdminReussi();
    }
  } catch (err) {
    console.error("Erreur d'authentification :", err);
  }
}

function basculerModeAdminReussi() {
  currentMode = 'admin';
  if (adminModal) adminModal.style.display = 'none';
  
  if (btnAdminMode) btnAdminMode.classList.add('active-tab');
  if (btnModeStudent) btnModeStudent.classList.remove('active-tab');
  
  document.getElementById('actionBtn').textContent = "Charger les notes de l'étudiant";
  document.getElementById('adminPanelContainer').style.display = 'block';
  document.getElementById('saveChangesBtn').style.display = 'block';
  document.getElementById('bulletinContainer').style.display = 'none';
  afficherErreurMatricule('');
  
  chargerDonneesDepuisSupabase().then(() => {
    chargerInterfaceAdmin();
  });
}

if (adminModalSubmit) {
  adminModalSubmit.addEventListener('click', executerConnexionAdmin);
}

// Gestion de la touche Entrée sur les champs du modal admin
[adminEmailInput, adminKeyInput].forEach(input => {
  if (input) {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        executerConnexionAdmin();
      }
    });
  }
});

// --- GESTION DE LA DÉCONNEXION SÉCURISÉE (Corrigée pour GitHub Pages) ---
const btnDeconnexion = document.getElementById('btnDeconnexion');
if (btnDeconnexion) {
  btnDeconnexion.addEventListener('click', async () => {
    try {
      if (_supabase) {
        await _supabase.auth.signOut();
      }
    } catch (err) {
      console.error("Erreur lors de la déconnexion Supabase :", err);
    } finally {
      // Nettoyage forcé du stockage local pour éviter les interférences sur GitHub Pages
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
          localStorage.removeItem(key);
        }
      });

      currentMode = 'student';
      window.location.reload(); 
    }
  });
}

// Écouteurs de changement sur TOUS les sélecteurs de filtres
['filiereSelect', 'promotionSelect', 'anneeSelect', 'semestreSelect'].forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('change', async () => {
      await chargerDonneesDepuisSupabase();
      if (currentMode === 'admin') {
        chargerInterfaceAdmin();
      }
      document.getElementById('bulletinContainer').style.display = 'none';
      afficherErreurMatricule('');
    });
  }
});

// --- 2. SYNCHRONISATION SUPABASE ---
async function chargerDonneesDepuisSupabase() {
  if (!_supabase) return;

  const cleFilierePromotion = obtenirCleSupabase();

  try {
    const { data, error } = await _supabase
      .from('academic_data')
      .select('content')
      .eq('filiere', cleFilierePromotion)
      .maybeSingle();

    if (error || !data || !data.content) {
      donneesActuelles = {
        structureUEParNiveau: {
          "BAPES 1": { "Semestre 1": [], "Semestre 2": [] },
          "BAPES 2": { "Semestre 3": [], "Semestre 4": [] },
          "BAPES 3": { "Semestre 5": [], "Semestre 6": [] }
        },
        publicationSemestres: {
          "BAPES 1": { "Semestre 1": false, "Semestre 2": false },
          "BAPES 2": { "Semestre 3": false, "Semestre 4": false },
          "BAPES 3": { "Semestre 5": false, "Semestre 6": false }
        },
        etudiants: []
      };
    } else {
      donneesActuelles = data.content;
      if (!donneesActuelles.structureUEParNiveau) {
        donneesActuelles.structureUEParNiveau = {
          "BAPES 1": { "Semestre 1": [], "Semestre 2": [] },
          "BAPES 2": { "Semestre 3": [], "Semestre 4": [] },
          "BAPES 3": { "Semestre 5": [], "Semestre 6": [] }
        };
      }
      if (!donneesActuelles.publicationSemestres) {
        donneesActuelles.publicationSemestres = {
          "BAPES 1": { "Semestre 1": false, "Semestre 2": false },
          "BAPES 2": { "Semestre 3": false, "Semestre 4": false },
          "BAPES 3": { "Semestre 5": false, "Semestre 6": false }
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

  const cleFilierePromotion = obtenirCleSupabase();

  const payload = {
    filiere: cleFilierePromotion,
    content: donneesActuelles
  };

  try {
    const { error } = await _supabase
      .from('academic_data')
      .upsert(payload, { onConflict: 'filiere' });

    if (error) {
      alert("Erreur lors de la synchronisation en ligne : " + error.message);
    } else {
      alert("Configuration et état de publication enregistrés avec succès !");
    }
  } catch (err) {
    alert("Une erreur technique est survenue lors de l'enregistrement.");
  }
};

// --- 3. GESTION DES ÉTUDIANTS ---
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
      alert("Un étudiant avec ce matricule existe déjà dans cette promotion.");
      return;
    }

    donneesActuelles.etudiants.push({
      matricule,
      nom,
      notes: {
        "BAPES 1": { "Semestre 1": {}, "Semestre 2": {} },
        "BAPES 2": { "Semestre 3": {}, "Semestre 4": {} },
        "BAPES 3": { "Semestre 5": {}, "Semestre 6": {} }
      },
      rattrapages: {
        "BAPES 1": { "Semestre 1": {}, "Semestre 2": {} },
        "BAPES 2": { "Semestre 3": {}, "Semestre 4": {} },
        "BAPES 3": { "Semestre 5": {}, "Semestre 6": {} }
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
    listContainer.innerHTML = `<span style="font-size:0.85rem; color:var(--text-muted);">Aucun étudiant enregistré dans cette promotion.</span>`;
    return;
  }

  donneesActuelles.etudiants.forEach((etudiant, index) => {
    const item = document.createElement('div');
    item.className = 'student-item-badge';
    item.innerHTML = `
      <span><strong>${etudiant.matricule}</strong> - ${etudiant.nom}</span>
      <div>
        <button type="button" class="btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.85rem; margin-right: 5px;" onclick="modifierEtudiant(${index})">Modifier</button>
        <button type="button" class="btn-danger" onclick="supprimerEtudiant(${index})">Supprimer</button>
      </div>
    `;
    listContainer.appendChild(item);
  });
}

window.modifierEtudiant = async function(index) {
  const etudiant = donneesActuelles.etudiants[index];
  const nouveauMatricule = prompt(`Modifier le matricule :`, etudiant.matricule);
  if (nouveauMatricule === null) return; 
  const matriculeNettoye = nouveauMatricule.trim();
  
  if (!matriculeNettoye) return alert("Le matricule ne peut pas être vide.");

  const nouveauNom = prompt(`Modifier le nom et prénoms :`, etudiant.nom);
  if (nouveauNom === null) return; 
  const nomNettoye = nouveauNom.trim();
  
  if (!nomNettoye) return alert("Le nom ne peut pas être vide.");

  donneesActuelles.etudiants[index].matricule = matriculeNettoye;
  donneesActuelles.etudiants[index].nom = nomNettoye;
  
  await sauvegarderDonneesVersSupabase();
  chargerListeEtudiantsAdmin();
};

window.supprimerEtudiant = async function(index) {
  donneesActuelles.etudiants.splice(index, 1);
  await sauvegarderDonneesVersSupabase();
  chargerListeEtudiantsAdmin();
};

// --- 4. MAQUETTE PÉDAGOGIQUE & CONTRÔLE DE PUBLICATION ---
function chargerInterfaceAdmin() {
  chargerInterfaceBuilder();
  chargerListeEtudiantsAdmin();
  calculerEtAfficherStatistiquesAdmin();
}

function chargerInterfaceBuilder() {
  const container = document.getElementById('ueBuilderList');
  if (!container) return;
  
  container.innerHTML = '';

  const annee = document.getElementById('anneeSelect').value;
  const semestre = document.getElementById('semestreSelect').value;

  if (!donneesActuelles.structureUEParNiveau[annee]) {
    donneesActuelles.structureUEParNiveau[annee] = {};
  }
  if (!donneesActuelles.structureUEParNiveau[annee][semestre]) {
    donneesActuelles.structureUEParNiveau[annee][semestre] = [];
  }

  if (!donneesActuelles.publicationSemestres) donneesActuelles.publicationSemestres = {};
  if (!donneesActuelles.publicationSemestres[annee]) donneesActuelles.publicationSemestres[annee] = {};
  
  let estPublie = !!donneesActuelles.publicationSemestres[annee][semestre];

  const publicationBox = document.createElement('div');
  publicationBox.className = 'publication-control-box';
  publicationBox.style.cssText = "background: #fff; padding: 1.25rem; border-radius: 8px; margin-bottom: 1.25rem; border: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; box-shadow: var(--shadow-sm);";
  publicationBox.innerHTML = `
    <div>
      <strong style="display:block; font-size:0.95rem; color:var(--primary);">Publication des résultats (${semestre} - ${annee})</strong>
      <span style="font-size:0.8rem; color:var(--text-muted);">Cochez pour rendre les notes visibles aux étudiants. Décochez pour garder le secret.</span>
    </div>
    <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-weight:600;">
      <input type="checkbox" id="checkboxPublicationSemestre" ${estPublie ? 'checked' : ''} style="width:18px; height:18px; cursor:pointer;">
      Publier les résultats
    </label>
  `;
  container.appendChild(publicationBox);

  const checkboxPub = publicationBox.querySelector('#checkboxPublicationSemestre');
  checkboxPub.addEventListener('change', (e) => {
    if (!donneesActuelles.publicationSemestres[annee]) {
      donneesActuelles.publicationSemestres[annee] = {};
    }
    donneesActuelles.publicationSemestres[annee][semestre] = e.target.checked;
  });

  const uesActuelles = donneesActuelles.structureUEParNiveau[annee][semestre];
  uesActuelles.forEach((ue, ueIndex) => {
    ajouterLigneUEBuilder(ue, ueIndex);
  });
}

window.ajouterUE = function() {
  capturerDonneesBuilderEnCours();
  const annee = document.getElementById('anneeSelect').value;
  const semestre = document.getElementById('semestreSelect').value;

  if (!donneesActuelles.structureUEParNiveau[annee]) donneesActuelles.structureUEParNiveau[annee] = {};
  if (!donneesActuelles.structureUEParNiveau[annee][semestre]) donneesActuelles.structureUEParNiveau[annee][semestre] = [];

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
        <input type="text" class="ec-code" placeholder="Code (ex: EC1)" value="${ec.nom}">
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
  
  if (!donneesActuelles.structureUEParNiveau) donneesActuelles.structureUEParNiveau = {};
  if (!donneesActuelles.structureUEParNiveau[annee]) donneesActuelles.structureUEParNiveau[annee] = {};
  donneesActuelles.structureUEParNiveau[annee][semestre] = nouvelleStructure;

  const checkboxPub = document.getElementById('checkboxPublicationSemestre');
  if (checkboxPub) {
    if (!donneesActuelles.publicationSemestres) donneesActuelles.publicationSemestres = {};
    if (!donneesActuelles.publicationSemestres[annee]) donneesActuelles.publicationSemestres[annee] = {};
    donneesActuelles.publicationSemestres[annee][semestre] = checkboxPub.checked;
  }
}

function calculerEtAfficherStatistiquesAdmin() {
  const annee = document.getElementById('anneeSelect').value;
  const semestre = document.getElementById('semestreSelect').value;
  const structureSemestre = donneesActuelles.structureUEParNiveau?.[annee]?.[semestre] || [];
  const etudiants = donneesActuelles.etudiants || [];

  if (etudiants.length === 0 || structureSemestre.length === 0) {
    supprimerBlocStatsIfExists();
    return;
  }

  let totalEtudiantsEvalues = 0;
  let totalAdmis = 0;
  let sommeMoyennesClasse = 0;
  const totalSemestreCredits = 30;

  etudiants.forEach(etudiant => {
    const notesSemestre = etudiant.notes?.[annee]?.[semestre] || {};
    const rattrapagesSemestre = etudiant.rattrapages?.[annee]?.[semestre] || {};
    const nombreNotes = Object.keys(notesSemestre).length;
    
    if (nombreNotes > 0) {
      totalEtudiantsEvalues++;
      let totalCreditsAcquis = 0;
      let totalWeightedScores = 0;

      structureSemestre.forEach(ue => {
        let sommeNotesUE = 0;
        ue.ecs.forEach(ec => {
          sommeNotesUE += notesSemestre[ec.nom] !== undefined ? notesSemestre[ec.nom] : 0;
        });

        let moyenneUE = ue.ecs.length > 0 ? sommeNotesUE / ue.ecs.length : 0;
        
        let estEnRattrapage = !!rattrapagesSemestre[ue.nomUE];
        if (estEnRattrapage && moyenneUE > 12.00) {
          moyenneUE = 12.00;
        }

        if (moyenneUE >= 10) totalCreditsAcquis += ue.credit;
        totalWeightedScores += moyenneUE * ue.credit;
      });

      let moyenneSemestrielle = totalWeightedScores / totalSemestreCredits;
      sommeMoyennesClasse += moyenneSemestrielle;

      if (totalCreditsAcquis >= 24 && moyenneSemestrielle >= 10) {
        totalAdmis++;
      }
    }
  });

  const moyenneGeneralePromotion = totalEtudiantsEvalues > 0 ? (sommeMoyennesClasse / totalEtudiantsEvalues).toFixed(2) : "0.00";
  const tauxReussite = totalEtudiantsEvalues > 0 ? ((totalAdmis / totalEtudiantsEvalues) * 100).toFixed(1) : "0.0";

  afficherOuMettreAJourBlocStats({
    total: totalEtudiantsEvalues,
    admis: totalAdmis,
    taux: tauxReussite,
    moyenne: moyenneGeneralePromotion
  });
}

function afficherOuMettreAJourBlocStats(stats) {
  let statsContainer = document.getElementById('adminStatsDashboard');
  
  if (!statsContainer) {
    statsContainer = document.createElement('div');
    statsContainer.id = 'adminStatsDashboard';
    statsContainer.style.cssText = "display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;";
    
    const adminPanel = document.getElementById('adminPanelContainer');
    if (adminPanel) {
      adminPanel.insertBefore(statsContainer, adminPanel.firstChild);
    }
  }

  statsContainer.innerHTML = `
    <div style="background: var(--card-bg); padding: 1rem; border-radius: 8px; border: 1px solid var(--border); text-align: center;">
      <span style="display:block; font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Évalués</span>
      <strong style="font-size: 1.25rem;">${stats.total}</strong>
    </div>
    <div style="background: var(--card-bg); padding: 1rem; border-radius: 8px; border: 1px solid var(--border); text-align: center;">
      <span style="display:block; font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Taux de réussite</span>
      <strong style="font-size: 1.25rem; color: #16a34a;">${stats.taux}%</strong>
    </div>
    <div style="background: var(--card-bg); padding: 1rem; border-radius: 8px; border: 1px solid var(--border); text-align: center;">
      <span style="display:block; font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Moyenne de classe</span>
      <strong style="font-size: 1.25rem;">${stats.moyenne}/20</strong>
    </div>
  `;
}

function supprimerBlocStatsIfExists() {
  const statsContainer = document.getElementById('adminStatsDashboard');
  if (statsContainer) statsContainer.remove();
}

// --- 5. CONSULTATION ÉTUDIANTE & FILTRE DE SÉCURITÉ ---
const actionBtn = document.getElementById('actionBtn');
if (actionBtn) {
  actionBtn.addEventListener('click', async () => {
    const matriculeInput = document.getElementById('matriculeInput');
    if (!matriculeInput) return;
    
    const matricule = matriculeInput.value.trim();
    if(!matricule) {
      afficherErreurMatricule("Veuillez entrer un numéro matricule !");
      document.getElementById('bulletinContainer').style.display = 'none';
      return;
    }

    await chargerDonneesDepuisSupabase();

    let etudiant = donneesActuelles.etudiants.find(e => e.matricule.toLowerCase() === matricule.toLowerCase());
    if (!etudiant) {
      afficherErreurMatricule("Aucun(e) Étudiant(e) Identifié(e) dans cette promotion !");
      document.getElementById('bulletinContainer').style.display = 'none';
      return;
    }

    const anneeKey = document.getElementById('anneeSelect').value;
    const semestreKey = document.getElementById('semestreSelect').value;

    if (currentMode !== 'admin') {
      const estPublie = donneesActuelles.publicationSemestres?.[anneeKey]?.[semestreKey] === true;
      
      if (!estPublie) {
        afficherErreurMatricule("Les résultats de ce semestre ne sont pas encore disponibles.");
        document.getElementById('bulletinContainer').style.display = 'none';
        return;
      }
    }

    const structureSemestre = donneesActuelles.structureUEParNiveau?.[anneeKey]?.[semestreKey] || [];
    if(structureSemestre.length === 0) {
      afficherErreurMatricule("Aucun résultat disponible pour ce semestre !");
      document.getElementById('bulletinContainer').style.display = 'none';
      return;
    }

    afficherErreurMatricule("");

    const filiereSelect = document.getElementById('filiereSelect');
    const filiereTexte = filiereSelect ? filiereSelect.options[filiereSelect.selectedIndex].text : "";
    
    const promoSelect = document.getElementById('promotionSelect');
    const promoTexte = promoSelect ? promoSelect.options[promoSelect.selectedIndex].text : "";

    afficherBulletin(filiereTexte, promoTexte, anneeKey, semestreKey, structureSemestre, etudiant);
  });
}

function afficherBulletin(nomFiliere, nomPromotion, annee, semestre, structureUE, etudiant) {
  document.getElementById('resFiliere').textContent = `${nomFiliere} (${nomPromotion})`;
  document.getElementById('resNiveau').textContent = annee;
  document.getElementById('resSemestre').textContent = semestre;
  document.getElementById('resMatricule').textContent = etudiant.matricule;
  document.getElementById('resNom').textContent = etudiant.nom;
  
  let container = document.getElementById('uesDynamicContainer');
  if (!container) return;
  
  let tableHTML = `
    <table class="academic-table">
      <thead>
        <tr>
          <th>Unité d'Enseignement (UE) / Élément Constitutif (EC)</th>
          <th class="text-center">Crédits</th>
          <th class="text-center">Notes</th>
          <th class="text-center">Moy. UE</th>
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

  if (!etudiant.rattrapages) etudiant.rattrapages = {};
  if (!etudiant.rattrapages[annee]) etudiant.rattrapages[annee] = {};
  if (!etudiant.rattrapages[annee][semestre]) etudiant.rattrapages[annee][semestre] = {};
  const rattrapagesSemestre = etudiant.rattrapages[annee][semestre];

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
    
    let estEnRattrapage = !!rattrapagesSemestre[ue.nomUE];
    if (estEnRattrapage && moyenneUE > 12.00) {
      moyenneUE = 12.00;
    }

    let estValide = moyenneUE >= 10;

    if (estValide) totalCreditsAcquired += ue.credit;
    totalWeightedScores += moyenneUE * ue.credit;

    let statutV_NV = estValide ? "V" : "NV";
    let statusClass = estValide ? "status-v" : "status-nv";

    let rattrapageCheckboxHTML = "";
    if (currentMode === 'admin') {
      rattrapageCheckboxHTML = `
        <div class="rattrapage-container">
          <input type="checkbox" class="rattrapage-checkbox" data-ue="${ue.nomUE}" ${estEnRattrapage ? 'checked' : ''}>
          <span>Session Rattrapage (Plafond 12)</span>
        </div>
      `;
    }

    tableHTML += `
      <tr class="ue-row-header">
        <td>
          ${ue.nomUE} : ${ue.libelle}
          ${rattrapageCheckboxHTML}
        </td>
        <td class="text-center">${ue.credit}</td>
        <td></td>
        <td class="text-center">${moyenneUE.toFixed(2)}</td>
        <td class="text-center"><span class="${statusClass}">${statutV_NV}</span></td>
      </tr>
      ${ecsRowsHTML}
    `;
  });

  tableHTML += `</tbody></table>`;
  container.innerHTML = tableHTML;

  let moyenneSemestrielle = totalWeightedScores / totalSemestreCredits;
  let pourcentage = (totalCreditsAcquired / totalSemestreCredits) * 100;

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

      if (!etudiant.rattrapages) etudiant.rattrapages = {};
      if (!etudiant.rattrapages[anneeKey]) etudiant.rattrapages[anneeKey] = {};
      if (!etudiant.rattrapages[anneeKey][semestreKey]) etudiant.rattrapages[anneeKey][semestreKey] = {};

      document.querySelectorAll('.rattrapage-checkbox').forEach(checkbox => {
        let ueNom = checkbox.getAttribute('data-ue');
        etudiant.rattrapages[anneeKey][semestreKey][ueNom] = checkbox.checked;
      });

      await sauvegarderDonneesVersSupabase();
      
      const filiereSelect = document.getElementById('filiereSelect');
      const filiereTexte = filiereSelect ? filiereSelect.options[filiereSelect.selectedIndex].text : "";
      
      const promoSelect = document.getElementById('promotionSelect');
      const promoTexte = promoSelect ? promoSelect.options[promoSelect.selectedIndex].text : "";

      const structureSemestre = donneesActuelles.structureUEParNiveau[anneeKey][semestreKey];
      
      afficherBulletin(filiereTexte, promoTexte, anneeKey, semestreKey, structureSemestre, etudiant);
      calculerEtAfficherStatistiquesAdmin();
    }
  });
}
