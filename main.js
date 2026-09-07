// ============================================================
// APPLICATION ACADÉMIQUE - SCRIPT COMPLET
// ============================================================
// Version refondue
//
// - Authentification Supabase corrigée
// - Initialisation DOM sécurisée
// - Gestion étudiants
// - Gestion structure UE / EC
// - Notes normales
// - Rattrapage indépendant EC par EC
// - Notes de rattrapage séparées
// - UE plafonnée à 12 si au moins un EC est en rattrapage
// - Statistiques
// - Publication des résultats
// ============================================================


// ============================================================
// 1. CONFIGURATION & INITIALISATION SUPABASE
// ============================================================

const SUPABASE_URL =
  'https://ecouwdvycrfrbljwoxwb.supabase.co';

const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjb3V3ZHZ5Y3JmcmJsandveHdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxMDI1MjEsImV4cCI6MjEwMzY3ODUyMX0.su8A21HqeHdLCxVI6f94aTruboQ8m8AIetya0KDQcGY';

let _supabase = null;

try {

  if (
    typeof supabase !== 'undefined' &&
    typeof supabase.createClient === 'function'
  ) {

    _supabase = supabase.createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY
    );

  } else {

    console.error(
      "Le SDK Supabase n'est pas chargé."
    );
  }

} catch (error) {

  console.error(
    "Erreur lors de l'initialisation de Supabase :",
    error
  );
}


let currentMode = 'student';


// ============================================================
// 2. STRUCTURE GLOBALE DES DONNÉES
// ============================================================

function creerStructureGlobale() {

  return {

    structureUEParNiveau: {

      "BAPES 1": {
        "Semestre 1": [],
        "Semestre 2": []
      },

      "BAPES 2": {
        "Semestre 3": [],
        "Semestre 4": []
      },

      "BAPES 3": {
        "Semestre 5": [],
        "Semestre 6": []
      }
    },

    publicationSemestres: {

      "BAPES 1": {
        "Semestre 1": false,
        "Semestre 2": false
      },

      "BAPES 2": {
        "Semestre 3": false,
        "Semestre 4": false
      },

      "BAPES 3": {
        "Semestre 5": false,
        "Semestre 6": false
      }
    },

    etudiants: []
  };
}


let donneesActuelles =
  creerStructureGlobale();


// ============================================================
// 3. STRUCTURES VIDES POUR LES NOTES
// ============================================================

function creerStructureSemestresVide() {

  return {

    "BAPES 1": {
      "Semestre 1": {},
      "Semestre 2": {}
    },

    "BAPES 2": {
      "Semestre 3": {},
      "Semestre 4": {}
    },

    "BAPES 3": {
      "Semestre 5": {},
      "Semestre 6": {}
    }
  };
}


function creerStructureNotesVide() {

  return creerStructureSemestresVide();
}


function creerStructureRattrapagesVide() {

  return creerStructureSemestresVide();
}


function creerStructureNotesRattrapageVide() {

  return creerStructureSemestresVide();
}


// ============================================================
// 4. NORMALISATION DES ÉTUDIANTS
// ============================================================

function normaliserEtudiant(etudiant) {

  if (!etudiant.notes) {
    etudiant.notes =
      creerStructureNotesVide();
  }

  if (!etudiant.rattrapages) {
    etudiant.rattrapages =
      creerStructureRattrapagesVide();
  }

  if (!etudiant.notesRattrapage) {
    etudiant.notesRattrapage =
      creerStructureNotesRattrapageVide();
  }

  return etudiant;
}


// ============================================================
// 5. NORMALISATION GÉNÉRALE
// ============================================================

function normaliserDonnees() {

  if (
    !donneesActuelles ||
    typeof donneesActuelles !== 'object'
  ) {
    donneesActuelles =
      creerStructureGlobale();

    return;
  }


  const structureDefaut =
    creerStructureGlobale();


  if (
    !donneesActuelles.structureUEParNiveau
  ) {

    donneesActuelles.structureUEParNiveau =
      structureDefaut.structureUEParNiveau;
  }


  if (
    !donneesActuelles.publicationSemestres
  ) {

    donneesActuelles.publicationSemestres =
      structureDefaut.publicationSemestres;
  }


  if (
    !Array.isArray(
      donneesActuelles.etudiants
    )
  ) {

    donneesActuelles.etudiants = [];
  }


  donneesActuelles.etudiants.forEach(
    normaliserEtudiant
  );
}


// ============================================================
// 6. OUTILS GÉNÉRAUX
// ============================================================

function obtenirCleSupabase() {

  const filiere =
    document.getElementById(
      'filiereSelect'
    )?.value || 'Allemand';


  const promotion =
    document.getElementById(
      'promotionSelect'
    )?.value || '17ème Promotion';


  return `${filiere} - ${promotion}`;
}


// ------------------------------------------------------------
// Affichage des erreurs matricule
// ------------------------------------------------------------

function afficherErreurMatricule(message) {

  const messageBox =
    document.getElementById(
      'messageErreur'
    );


  if (!messageBox) return;


  if (message) {

    messageBox.textContent =
      message;

    messageBox.style.display =
      'block';

  } else {

    messageBox.textContent =
      '';

    messageBox.style.display =
      'none';
  }
}


// ============================================================
// 7. SEMESTRES
// ============================================================

function mettreAJourSemestres() {

  const anneeSelect =
    document.getElementById(
      'anneeSelect'
    );


  const semestreSelect =
    document.getElementById(
      'semestreSelect'
    );


  if (
    !anneeSelect ||
    !semestreSelect
  ) {
    return;
  }


  const niveauActuel =
    anneeSelect.value;


  let premierSemestreVisible =
    null;


  Array.from(
    semestreSelect.options
  ).forEach(option => {

    const niveauAssocie =
      option.getAttribute(
        'data-niveau'
      );


    if (
      niveauAssocie ===
      niveauActuel
    ) {

      option.style.display =
        '';

      if (
        premierSemestreVisible ===
        null
      ) {

        premierSemestreVisible =
          option.value;
      }

    } else {

      option.style.display =
        'none';
    }
  });


  const optionActuelle =
    semestreSelect.options[
      semestreSelect.selectedIndex
    ];


  if (
    optionActuelle &&
    optionActuelle.getAttribute(
      'data-niveau'
    ) !== niveauActuel
  ) {

    if (
      premierSemestreVisible
    ) {

      semestreSelect.value =
        premierSemestreVisible;
    }
  }
}


// ============================================================
// 8. OUTILS NOTES
// ============================================================

function convertirNote(valeur) {

  if (
    valeur === undefined ||
    valeur === null ||
    valeur === ''
  ) {

    return null;
  }


  const nombre =
    parseFloat(valeur);


  if (Number.isNaN(nombre)) {
    return null;
  }


  if (nombre < 0 || nombre > 20) {
    return null;
  }

  return nombre;
}


// ------------------------------------------------------------
// Note initiale
// ------------------------------------------------------------

function obtenirNoteInitiale(
  etudiant,
  annee,
  semestre,
  nomEC
) {

  const notes =
    etudiant.notes
      ?.[annee]
      ?.[semestre] || {};


  return convertirNote(
    notes[nomEC]
  );
}


// ------------------------------------------------------------
// Note de rattrapage
// ------------------------------------------------------------

function obtenirNoteRattrapage(
  etudiant,
  annee,
  semestre,
  nomEC
) {

  const notes =
    etudiant.notesRattrapage
      ?.[annee]
      ?.[semestre] || {};


  return convertirNote(
    notes[nomEC]
  );
}


// ------------------------------------------------------------
// EC en rattrapage ?
// ------------------------------------------------------------

function estECEnRattrapage(
  etudiant,
  annee,
  semestre,
  nomEC
) {

  const rattrapages =
    etudiant.rattrapages
      ?.[annee]
      ?.[semestre] || {};


  return rattrapages[nomEC] === true;
}


// ------------------------------------------------------------
// Note effective
// ------------------------------------------------------------

function obtenirNoteEffective(
  etudiant,
  annee,
  semestre,
  nomEC
) {

  const noteInitiale =
    obtenirNoteInitiale(
      etudiant,
      annee,
      semestre,
      nomEC
    );


  const noteRattrapage =
    obtenirNoteRattrapage(
      etudiant,
      annee,
      semestre,
      nomEC
    );


  const estEnRattrapage =
    estECEnRattrapage(
      etudiant,
      annee,
      semestre,
      nomEC
    );


  if (
    estEnRattrapage &&
    noteRattrapage !== null
  ) {

    return noteRattrapage;
  }


  return noteInitiale !== null
    ? noteInitiale
    : 0;
}


// ============================================================
// 9. CALCUL D'UNE UE
// ============================================================

function calculerUE(
  etudiant,
  annee,
  semestre,
  ue
) {

  normaliserEtudiant(etudiant);


  let sommeNotes =
    0;


  let nombreEC =
    Array.isArray(ue.ecs)
      ? ue.ecs.length
      : 0;


  let auMoinsUnRattrapage =
    false;


  if (nombreEC === 0) {

    return {

      moyenneUE: 0,

      auMoinsUnRattrapage:
        false,

      valide: false
    };
  }


  ue.ecs.forEach(ec => {

    const noteEffective =
      obtenirNoteEffective(
        etudiant,
        annee,
        semestre,
        ec.nom
      );


    sommeNotes +=
      noteEffective;


    if (
      estECEnRattrapage(
        etudiant,
        annee,
        semestre,
        ec.nom
      )
    ) {

      auMoinsUnRattrapage =
        true;
    }
  });


  let moyenneUE =
    sommeNotes /
    nombreEC;


  // ----------------------------------------------------------
  // RÈGLE DU RATTRAPAGE
  //
  // Dès qu'un EC de l'UE est en rattrapage,
  // la moyenne de l'UE ne peut pas dépasser 12.
  // ----------------------------------------------------------

  if (
    auMoinsUnRattrapage &&
    moyenneUE > 12
  ) {

    moyenneUE =
      12;
  }


  return {

    moyenneUE,

    auMoinsUnRattrapage,

    valide:
      moyenneUE >= 12
  };
}


// ============================================================
// 10. MIGRATION ANCIEN SYSTÈME DE RATTRAPAGE
// ============================================================
//
// Ancien système :
// rattrapages[semestre][nomUE] = true
//
// Nouveau système :
// rattrapages[semestre][nomEC] = true
//
// On convertit les anciennes données vers les EC
// insuffisants uniquement.
// ============================================================

function migrerAncienFormatRattrapage() {

  const structure =
    donneesActuelles
      .structureUEParNiveau || {};


  donneesActuelles.etudiants
    .forEach(etudiant => {

      normaliserEtudiant(
        etudiant
      );


      Object.keys(structure)
        .forEach(annee => {

          const semestres =
            structure[annee] || {};


          Object.keys(semestres)
            .forEach(semestre => {

              const ues =
                semestres[semestre] || [];


              const rattrapages =
                etudiant.rattrapages
                  ?.[annee]
                  ?.[semestre];


              if (!rattrapages) {
                return;
              }


              ues.forEach(ue => {

                // Ancienne clé UE
                if (
                  rattrapages[
                    ue.nomUE
                  ] === true
                ) {

                  ue.ecs.forEach(
                    ec => {

                      const note =
                        obtenirNoteInitiale(
                          etudiant,
                          annee,
                          semestre,
                          ec.nom
                        );


                      // Seuls les EC < 12
                      // passent en rattrapage.
                      if (
                        note === null ||
                        note < 12
                      ) {

                        rattrapages[
                          ec.nom
                        ] = true;
                      }
                    }
                  );


                  delete rattrapages[
                    ue.nomUE
                  ];
                }
              });
            });
        });
    });
}


// ============================================================
// 11. CHARGEMENT INITIAL
// ============================================================

function initialiserInterface() {

  mettreAJourSemestres();


  currentMode =
    'student';


  const btnModeStudent =
    document.getElementById(
      'btnModeStudent'
    );


  const btnAdminMode =
    document.getElementById(
      'btnAdminMode'
    );


  if (btnModeStudent) {

    btnModeStudent.classList.add(
      'active-tab'
    );
  }


  if (btnAdminMode) {

    btnAdminMode.classList.remove(
      'active-tab'
    );
  }


  const actionBtn =
    document.getElementById(
      'actionBtn'
    );


  if (actionBtn) {

    actionBtn.textContent =
      "Accédez à vos résultats";
  }


  const adminPanel =
    document.getElementById(
      'adminPanelContainer'
    );


  if (adminPanel) {

    adminPanel.style.display =
      'none';
  }


  const studentSection =
    document.getElementById(
      'studentSection'
    );


  if (studentSection) {

    studentSection.style.display =
      'block';
  }


  const saveChanges =
    document.getElementById(
      'saveChangesBtn'
    );


  if (saveChanges) {

    saveChanges.style.display =
      'none';
  }


  const bulletin =
    document.getElementById(
      'bulletinContainer'
    );


  if (bulletin) {

    bulletin.style.display =
      'none';
  }


  afficherErreurMatricule('');
}


// ============================================================
// 12. AUTHENTIFICATION ADMIN
// ============================================================

function obtenirElementsAuth() {

  return {

    modal:
      document.getElementById(
        'adminModal'
      ),

    email:
      document.getElementById(
        'adminEmailInput'
      ),

    password:
      document.getElementById(
        'adminKeyInput'
      ),

    error:
      document.getElementById(
        'adminModalError'
      ),

    cancel:
      document.getElementById(
        'adminModalCancel'
      ),

    submit:
      document.getElementById(
        'adminModalSubmit'
      )
  };
}


// ------------------------------------------------------------
// Ouvrir modal
// ------------------------------------------------------------

async function ouvrirConnexionAdmin() {

  const {
    modal,
    email,
    password,
    error
  } = obtenirElementsAuth();


  if (!modal) return;


  // ----------------------------------------------------------
  // Si une session existe déjà
  // ----------------------------------------------------------

  if (_supabase) {

    try {

      const {
        data,
        error: sessionError
      } =
        await _supabase.auth.getSession();


      if (
        !sessionError &&
        data &&
        data.session
      ) {

        basculerModeAdminReussi();

        return;
      }

    } catch (errorSession) {

      console.error(
        "Erreur vérification session :",
        errorSession
      );
    }
  }


  modal.style.display =
    'flex';


  if (password) {
    password.value = '';
  }


  if (error) {

    error.textContent =
      '';

    error.style.display =
      'none';
  }


  if (email) {
    email.focus();
  }
}


// ------------------------------------------------------------
// Fermer modal
// ------------------------------------------------------------

function fermerAdminModal() {

  const {
    modal
  } = obtenirElementsAuth();


  if (modal) {

    modal.style.display =
      'none';
  }


  if (currentMode !== 'admin') {

    const studentBtn =
      document.getElementById(
        'btnModeStudent'
      );


    const adminBtn =
      document.getElementById(
        'btnAdminMode'
      );


    if (studentBtn) {

      studentBtn.classList.add(
        'active-tab'
      );
    }


    if (adminBtn) {

      adminBtn.classList.remove(
        'active-tab'
      );
    }
  }
}


// ------------------------------------------------------------
// Traduction des erreurs Supabase
// ------------------------------------------------------------

function obtenirMessageErreurConnexion(error) {

  if (!error) {

    return "Échec de l'authentification.";
  }


  const message =
    String(
      error.message || ''
    ).toLowerCase();


  if (
    message.includes(
      'invalid login credentials'
    )
  ) {

    return (
      "E-mail ou mot de passe incorrect. " +
      "Vérifiez également que l'adresse e-mail est bien celle du compte administrateur Supabase."
    );
  }


  if (
    message.includes(
      'email not confirmed'
    )
  ) {

    return (
      "L'adresse e-mail du compte administrateur n'est pas encore confirmée dans Supabase."
    );
  }


  if (
    message.includes(
      'user not found'
    )
  ) {

    return (
      "Aucun compte administrateur ne correspond à cette adresse e-mail."
    );
  }


  if (
    message.includes(
      'too many requests'
    )
  ) {

    return (
      "Trop de tentatives de connexion. Veuillez patienter quelques instants."
    );
  }


  return (
    "Erreur Supabase : " +
    (
      error.message ||
      "Impossible de se connecter."
    )
  );
}


// ------------------------------------------------------------
// CONNEXION ADMIN
// ------------------------------------------------------------

async function executerConnexionAdmin() {

  const {
    email,
    password,
    error: errorBox
  } = obtenirElementsAuth();


  if (!_supabase) {

    if (errorBox) {

      errorBox.textContent =
        "Supabase n'est pas correctement initialisé.";

      errorBox.style.display =
        'block';
    }

    return;
  }


  if (!email || !password) {
    return;
  }


  // IMPORTANT :
  // On trim uniquement l'e-mail.
  // On NE trim PAS le mot de passe.
  const emailAdmin =
    email.value.trim();


  const passwordAdmin =
    password.value;


  if (!emailAdmin) {

    if (errorBox) {

      errorBox.textContent =
        "Veuillez saisir l'adresse e-mail administrateur.";

      errorBox.style.display =
        'block';
    }

    email.focus();

    return;
  }


  if (!passwordAdmin) {

    if (errorBox) {

      errorBox.textContent =
        "Veuillez saisir le mot de passe administrateur.";

      errorBox.style.display =
        'block';
    }

    password.focus();

    return;
  }


  if (errorBox) {

    errorBox.textContent =
      "Connexion en cours...";

    errorBox.style.display =
      'block';

    errorBox.style.color =
      '#2563eb';
  }


  const submit =
    document.getElementById(
      'adminModalSubmit'
    );


  if (submit) {

    submit.disabled =
      true;

    submit.textContent =
      "Connexion...";
  }


  try {

    const {
      data,
      error: authError
    } =
      await _supabase.auth.signInWithPassword({

        email:
          emailAdmin,

        password:
          passwordAdmin
      });


    if (authError) {

      console.error(
        "Erreur Supabase de connexion :",
        authError
      );


      if (errorBox) {

        errorBox.textContent =
          obtenirMessageErreurConnexion(
            authError
          );

        errorBox.style.display =
          'block';

        errorBox.style.color =
          '#dc2626';
      }


      return;
    }


    if (
      !data ||
      !data.session
    ) {

      if (errorBox) {

        errorBox.textContent =
          "Connexion impossible : aucune session Supabase n'a été créée.";

        errorBox.style.display =
          'block';

        errorBox.style.color =
          '#dc2626';
      }


      return;
    }


    // Connexion réussie
    basculerModeAdminReussi();


  } catch (errorConnexion) {

    console.error(
      "Erreur technique de connexion :",
      errorConnexion
    );


    if (errorBox) {

      errorBox.textContent =
        "Une erreur technique est survenue pendant la connexion.";

      errorBox.style.display =
        'block';

      errorBox.style.color =
        '#dc2626';
    }


  } finally {

    if (submit) {

      submit.disabled =
        false;

      submit.textContent =
        "Valider";
    }
  }
}


// ============================================================
// 13. PASSAGE EN MODE ADMIN
// ============================================================

async function basculerModeAdminReussi() {

  currentMode =
    'admin';


  const {
    modal
  } = obtenirElementsAuth();


  if (modal) {

    modal.style.display =
      'none';
  }


  const btnAdmin =
    document.getElementById(
      'btnAdminMode'
    );


  const btnStudent =
    document.getElementById(
      'btnModeStudent'
    );


  if (btnAdmin) {

    btnAdmin.classList.add(
      'active-tab'
    );
  }


  if (btnStudent) {

    btnStudent.classList.remove(
      'active-tab'
    );
  }


  const actionBtn =
    document.getElementById(
      'actionBtn'
    );


  if (actionBtn) {

    actionBtn.textContent =
      "Charger les notes de l'étudiant";
  }


  const adminPanel =
    document.getElementById(
      'adminPanelContainer'
    );


  if (adminPanel) {

    adminPanel.style.display =
      'block';
  }


  const studentSection =
    document.getElementById(
      'studentSection'
    );


  if (studentSection) {

    studentSection.style.display =
      'block';
  }


  const saveBtn =
    document.getElementById(
      'saveChangesBtn'
    );


  if (saveBtn) {

    saveBtn.style.display =
      'block';
  }


  const bulletin =
    document.getElementById(
      'bulletinContainer'
    );


  if (bulletin) {

    bulletin.style.display =
      'none';
  }


  afficherErreurMatricule('');


  await chargerDonneesDepuisSupabase();


  chargerInterfaceAdmin();
}


// ============================================================
// 14. DÉCONNEXION
// ============================================================

async function deconnecterAdmin() {

  try {

    if (_supabase) {

      await _supabase.auth.signOut();
    }

  } catch (error) {

    console.error(
      "Erreur de déconnexion :",
      error
    );

  } finally {

    try {

      Object.keys(
        localStorage
      ).forEach(key => {

        if (
          key.includes(
            'supabase.auth.token'
          ) ||
          key.startsWith('sb-')
        ) {

          localStorage.removeItem(
            key
          );
        }
      });

    } catch (storageError) {

      console.error(
        storageError
      );
    }


    try {
      sessionStorage.clear();
    } catch (errorSession) {
      console.error(errorSession);
    }


    currentMode =
      'student';


    window.location.href =
      window.location.pathname;
  }
}


// ============================================================
// 15. SUPABASE : CHARGEMENT
// ============================================================

async function chargerDonneesDepuisSupabase() {

  if (!_supabase) {

    console.error(
      "Supabase n'est pas initialisé."
    );

    return;
  }


  const cleFilierePromotion =
    obtenirCleSupabase();


  try {

    const {
      data,
      error
    } =
      await _supabase
        .from('academic_data')
        .select('content')
        .eq(
          'filiere',
          cleFilierePromotion
        )
        .maybeSingle();


    if (error) {

      console.error(
        "Erreur Supabase chargement :",
        error
      );

      return;
    }


    if (
      !data ||
      !data.content
    ) {

      donneesActuelles =
        creerStructureGlobale();

    } else {

      donneesActuelles =
        data.content;


      normaliserDonnees();


      // Conversion de l'ancien système
      // UE -> nouveau système EC.
      migrerAncienFormatRattrapage();
    }


    normaliserDonnees();


  } catch (error) {

    console.error(
      "Erreur lors du chargement des données :",
      error
    );
  }
}


// ============================================================
// 16. SUPABASE : SAUVEGARDE
// ============================================================

window.sauvegarderDonneesVersSupabase =
  async function() {

    if (
      currentMode === 'admin'
    ) {

      capturerDonneesBuilderEnCours();
    }


    if (!_supabase) {

      alert(
        "Erreur : Supabase n'est pas initialisé."
      );

      return false;
    }


    normaliserDonnees();


    const cleFilierePromotion =
      obtenirCleSupabase();


    const payload = {

      filiere:
        cleFilierePromotion,

      content:
        donneesActuelles
    };


    try {

      const {
        error
      } =
        await _supabase
          .from('academic_data')
          .upsert(
            payload,
            {
              onConflict:
                'filiere'
            }
          );


      if (error) {

        console.error(
          "Erreur sauvegarde :",
          error
        );


        alert(
          "Erreur lors de la synchronisation : " +
          error.message
        );


        return false;
      }


      return true;


    } catch (error) {

      console.error(
        error
      );


      alert(
        "Une erreur technique est survenue lors de l'enregistrement."
      );


      return false;
    }
  };


// ============================================================
// 17. CHANGEMENT DE MODE
// ============================================================

function activerModeEtudiant() {

  currentMode =
    'student';


  const btnStudent =
    document.getElementById(
      'btnModeStudent'
    );


  const btnAdmin =
    document.getElementById(
      'btnAdminMode'
    );


  if (btnStudent) {

    btnStudent.classList.add(
      'active-tab'
    );
  }


  if (btnAdmin) {

    btnAdmin.classList.remove(
      'active-tab'
    );
  }


  const actionBtn =
    document.getElementById(
      'actionBtn'
    );


  if (actionBtn) {

    actionBtn.textContent =
      "Accédez à vos résultats";
  }


  const adminPanel =
    document.getElementById(
      'adminPanelContainer'
    );


  if (adminPanel) {

    adminPanel.style.display =
      'none';
  }


  const studentSection =
    document.getElementById(
      'studentSection'
    );


  if (studentSection) {

    studentSection.style.display =
      'block';
  }


  const saveBtn =
    document.getElementById(
      'saveChangesBtn'
    );


  if (saveBtn) {

    saveBtn.style.display =
      'none';
  }


  const bulletin =
    document.getElementById(
      'bulletinContainer'
    );


  if (bulletin) {

    bulletin.style.display =
      'none';
  }


  afficherErreurMatricule('');
}


// ============================================================
// 18. GESTION DES ÉTUDIANTS
// ============================================================

async function ajouterEtudiant() {

  const matriculeInput =
    document.getElementById(
      'newMatricule'
    );


  const nomInput =
    document.getElementById(
      'newNom'
    );


  if (
    !matriculeInput ||
    !nomInput
  ) {

    return;
  }


  const matricule =
    matriculeInput.value.trim();


  const nom =
    nomInput.value.trim();


  if (
    !matricule ||
    !nom
  ) {

    alert(
      "Veuillez saisir le matricule et le nom de l'étudiant."
    );

    return;
  }


  if (
    donneesActuelles.etudiants.some(
      etudiant =>
        String(
          etudiant.matricule
        ).toLowerCase() ===
        matricule.toLowerCase()
    )
  ) {

    alert(
      "Un étudiant avec ce matricule existe déjà dans cette promotion."
    );

    return;
  }


  const nouvelEtudiant = {

    matricule,

    nom,

    notes:
      creerStructureNotesVide(),

    rattrapages:
      creerStructureRattrapagesVide(),

    notesRattrapage:
      creerStructureNotesRattrapageVide()
  };


  donneesActuelles.etudiants.push(
    nouvelEtudiant
  );


  const sauvegarde =
    await window.sauvegarderDonneesVersSupabase();


  if (!sauvegarde) {

    // En cas d'échec, on retire l'étudiant
    donneesActuelles.etudiants.pop();

    return;
  }


  matriculeInput.value =
    '';

  nomInput.value =
    '';


  chargerListeEtudiantsAdmin();
}


function chargerListeEtudiantsAdmin() {

  const container =
    document.getElementById(
      'adminStudentsList'
    );


  if (!container) {
    return;
  }


  container.innerHTML =
    '';


  if (
    donneesActuelles.etudiants.length ===
    0
  ) {

    container.innerHTML = `

      <span
        style="
          font-size:0.85rem;
          color:var(--text-muted);
        ">

        Aucun étudiant enregistré dans cette promotion.

      </span>
    `;

    return;
  }


  donneesActuelles.etudiants
    .forEach(
      (etudiant, index) => {

        const item =
          document.createElement(
            'div'
          );


        item.className =
          'student-item-badge';


        item.style.cssText =
          `
          display:flex;
          align-items:center;
          justify-content:space-between;
          padding:0.6rem 0.75rem;
          background:#fff;
          border:1px solid var(--border);
          border-radius:var(--radius-sm);
          margin-bottom:0.5rem;
          `;


        item.innerHTML = `

          <span>

            <strong>
              ${etudiant.matricule}
            </strong>

            -
            ${etudiant.nom}

          </span>

          <div>

            <button
              type="button"
              class="btn-secondary"
              style="
                padding:0.4rem 0.8rem;
                font-size:0.85rem;
                margin-right:5px;
              "
              onclick="modifierEtudiant(${index})">

              Modifier

            </button>


            <button
              type="button"
              class="btn-danger"
              onclick="supprimerEtudiant(${index})">

              Supprimer

            </button>

          </div>
        `;


        container.appendChild(
          item
        );
      }
    );
}


// ============================================================
// MODIFIER ÉTUDIANT
// ============================================================

window.modifierEtudiant =
  async function(index) {

    const etudiant =
      donneesActuelles
        .etudiants[index];


    if (!etudiant) {
      return;
    }


    const nouveauMatricule =
      prompt(
        "Modifier le matricule :",
        etudiant.matricule
      );


    if (
      nouveauMatricule ===
      null
    ) {
      return;
    }


    const matriculeNettoye =
      nouveauMatricule.trim();


    if (!matriculeNettoye) {

      alert(
        "Le matricule ne peut pas être vide."
      );

      return;
    }


    const existeDeja =
      donneesActuelles
        .etudiants
        .some(
          (e, i) =>
            i !== index &&
            String(
              e.matricule
            ).toLowerCase() ===
            matriculeNettoye.toLowerCase()
        );


    if (existeDeja) {

      alert(
        "Ce matricule est déjà utilisé."
      );

      return;
    }


    const nouveauNom =
      prompt(
        "Modifier le nom et prénoms :",
        etudiant.nom
      );


    if (
      nouveauNom ===
      null
    ) {
      return;
    }


    const nomNettoye =
      nouveauNom.trim();


    if (!nomNettoye) {

      alert(
        "Le nom ne peut pas être vide."
      );

      return;
    }


    etudiant.matricule =
      matriculeNettoye;


    etudiant.nom =
      nomNettoye;


    const sauvegarde =
      await window.sauvegarderDonneesVersSupabase();


    if (sauvegarde) {

      chargerListeEtudiantsAdmin();
    }
  };


// ============================================================
// SUPPRIMER ÉTUDIANT
// ============================================================

window.supprimerEtudiant =
  async function(index) {

    const etudiant =
      donneesActuelles
        .etudiants[index];


    if (!etudiant) {
      return;
    }


    const confirmation =
      confirm(
        `Voulez-vous vraiment supprimer l'étudiant ${etudiant.nom} (${etudiant.matricule}) ?`
      );


    if (!confirmation) {
      return;
    }


    const sauvegardeOriginale =
      donneesActuelles
        .etudiants
        .slice();


    donneesActuelles.etudiants
      .splice(
        index,
        1
      );


    const sauvegarde =
      await window.sauvegarderDonneesVersSupabase();


    if (!sauvegarde) {

      donneesActuelles.etudiants =
        sauvegardeOriginale;

      return;
    }


    chargerListeEtudiantsAdmin();
  };


// ============================================================
// 19. MAQUETTE PÉDAGOGIQUE
// ============================================================

function chargerInterfaceAdmin() {

  chargerInterfaceBuilder();

  chargerListeEtudiantsAdmin();

  calculerEtAfficherStatistiquesAdmin();
}


// ============================================================
// CONSTRUCTEUR UE
// ============================================================

function chargerInterfaceBuilder() {

  const container =
    document.getElementById(
      'ueBuilderList'
    );


  if (!container) {
    return;
  }


  container.innerHTML =
    '';


  const annee =
    document.getElementById(
      'anneeSelect'
    )?.value;


  const semestre =
    document.getElementById(
      'semestreSelect'
    )?.value;


  if (
    !annee ||
    !semestre
  ) {
    return;
  }


  if (
    !donneesActuelles
      .structureUEParNiveau[
        annee
      ]
  ) {

    donneesActuelles
      .structureUEParNiveau[
        annee
      ] = {};
  }


  if (
    !donneesActuelles
      .structureUEParNiveau[
        annee
      ][semestre]
  ) {

    donneesActuelles
      .structureUEParNiveau[
        annee
      ][semestre] = [];
  }


  if (
    !donneesActuelles
      .publicationSemestres[
        annee
      ]
  ) {

    donneesActuelles
      .publicationSemestres[
        annee
      ] = {};
  }


  const estPublie =
    !!donneesActuelles
      .publicationSemestres[
        annee
      ][semestre];


  const publicationBox =
    document.createElement(
      'div'
    );


  publicationBox.className =
    'publication-control-box';


  publicationBox.style.cssText =
    `
    background:#fff;
    padding:1.25rem;
    border-radius:8px;
    margin-bottom:1.25rem;
    border:1px solid var(--border);
    display:flex;
    align-items:center;
    justify-content:space-between;
    box-shadow:var(--shadow-sm);
    `;


  publicationBox.innerHTML = `

    <div>

      <strong
        style="
          display:block;
          font-size:0.95rem;
          color:var(--primary);
        ">

        Publication des résultats
        (${semestre} - ${annee})

      </strong>


      <span
        style="
          font-size:0.8rem;
          color:var(--text-muted);
        ">

        Cochez pour rendre les notes visibles aux étudiants.

      </span>

    </div>


    <label
      style="
        display:flex;
        align-items:center;
        gap:8px;
        cursor:pointer;
        font-weight:600;
      ">

      <input
        type="checkbox"
        id="checkboxPublicationSemestre"
        ${estPublie ? 'checked' : ''}
        style="
          width:18px;
          height:18px;
          cursor:pointer;
        ">

      Publier les résultats

    </label>
  `;


  container.appendChild(
    publicationBox
  );


  const checkboxPub =
    publicationBox.querySelector(
      '#checkboxPublicationSemestre'
    );


  if (checkboxPub) {

    checkboxPub.addEventListener(
      'change',
      event => {

        if (
          !donneesActuelles
            .publicationSemestres[
              annee
            ]
        ) {

          donneesActuelles
            .publicationSemestres[
              annee
            ] = {};
        }


        donneesActuelles
          .publicationSemestres[
            annee
          ][semestre] =
          event.target.checked;
      }
    );
  }


  const ues =
    donneesActuelles
      .structureUEParNiveau[
        annee
      ][semestre];


  ues.forEach(
    (ue, index) => {

      ajouterLigneUEBuilder(
        ue,
        index
      );
    }
  );
}


// ============================================================
// AJOUTER UE
// ============================================================

window.ajouterUE =
  function() {

    capturerDonneesBuilderEnCours();


    const annee =
      document.getElementById(
        'anneeSelect'
      )?.value;


    const semestre =
      document.getElementById(
        'semestreSelect'
      )?.value;


    if (
      !annee ||
      !semestre
    ) {
      return;
    }


    if (
      !donneesActuelles
        .structureUEParNiveau[
          annee
        ]
    ) {

      donneesActuelles
        .structureUEParNiveau[
          annee
        ] = {};
    }


    if (
      !donneesActuelles
        .structureUEParNiveau[
          annee
        ][semestre]
    ) {

      donneesActuelles
        .structureUEParNiveau[
          annee
        ][semestre] = [];
    }


    const nombreUE =
      donneesActuelles
        .structureUEParNiveau[
          annee
        ][semestre].length;


    donneesActuelles
      .structureUEParNiveau[
        annee
      ][semestre]
      .push({

        nomUE:
          `UE${nombreUE + 1}`,

        libelle:
          "",

        credit:
          6,

        ecs:
          []
      });


    chargerInterfaceBuilder();
  };


// ============================================================
// AFFICHER UE
// ============================================================

function ajouterLigneUEBuilder(
  ueData,
  ueIndex
) {

  const container =
    document.getElementById(
      'ueBuilderList'
    );


  if (!container) {
    return;
  }


  const card =
    document.createElement(
      'div'
    );


  card.className =
    'ue-builder-card';


  let ecsHtml =
    '';


  const ecs =
    Array.isArray(
      ueData.ecs
    )
      ? ueData.ecs
      : [];


  ecs.forEach(
    (ec, ecIndex) => {

      ecsHtml += `

        <div
          class="ec-builder-row">

          <input
            type="text"
            class="ec-code"
            placeholder="Code (ex: EC1)"
            value="${ec.nom || ''}">

          <input
            type="text"
            class="ec-label"
            placeholder="Libellé de l'élément constitutif"
            value="${ec.label || ''}">

          <button
            type="button"
            class="btn-danger"
            onclick="supprimerEC(${ueIndex}, ${ecIndex})">

            X

          </button>

        </div>
      `;
    }
  );


  card.innerHTML = `

    <div
      class="ue-builder-header">

      <input
        type="text"
        class="ue-code"
        placeholder="Nom UE"
        value="${ueData.nomUE || ''}"
        style="width:90px;">


      <input
        type="text"
        class="ue-libelle"
        placeholder="Libellé de l'UE"
        value="${ueData.libelle || ''}"
        style="flex:2;">


      <input
        type="number"
        class="ue-credit"
        placeholder="Crédits"
        value="${ueData.credit ?? 0}"
        min="1"
        max="30"
        style="width:90px;">


      <button
        type="button"
        class="btn-secondary"
        onclick="ajouterEC(${ueIndex})">

        + EC

      </button>


      <button
        type="button"
        class="btn-danger"
        onclick="supprimerUE(${ueIndex})">

        Supprimer UE

      </button>

    </div>


    <div
      class="ecs-container">

      ${ecsHtml}

    </div>
  `;


  container.appendChild(
    card
  );
}


// ============================================================
// AJOUTER EC
// ============================================================

window.ajouterEC =
  function(ueIndex) {

    capturerDonneesBuilderEnCours();


    const annee =
      document.getElementById(
        'anneeSelect'
      )?.value;


    const semestre =
      document.getElementById(
        'semestreSelect'
      )?.value;


    if (
      !annee ||
      !semestre
    ) {
      return;
    }


    const ue =
      donneesActuelles
        .structureUEParNiveau[
          annee
        ][semestre][ueIndex];


    if (!ue) {
      return;
    }


    if (!Array.isArray(ue.ecs)) {
      ue.ecs = [];
    }


    ue.ecs.push({

      nom:
        `EC${ue.ecs.length + 1}`,

      label:
        ""
    });


    chargerInterfaceBuilder();
  };


// ============================================================
// SUPPRIMER UE
// ============================================================

window.supprimerUE =
  function(ueIndex) {

    const confirmation =
      confirm(
        "Voulez-vous vraiment supprimer cette UE ?"
      );


    if (!confirmation) {
      return;
    }


    capturerDonneesBuilderEnCours();


    const annee =
      document.getElementById(
        'anneeSelect'
      )?.value;


    const semestre =
      document.getElementById(
        'semestreSelect'
      )?.value;


    if (
      !annee ||
      !semestre
    ) {
      return;
    }


    donneesActuelles
      .structureUEParNiveau[
        annee
      ][semestre]
      .splice(
        ueIndex,
        1
      );


    chargerInterfaceBuilder();
  };


// ============================================================
// SUPPRIMER EC
// ============================================================

window.supprimerEC =
  function(
    ueIndex,
    ecIndex
  ) {

    capturerDonneesBuilderEnCours();


    const annee =
      document.getElementById(
        'anneeSelect'
      )?.value;


    const semestre =
      document.getElementById(
        'semestreSelect'
      )?.value;


    if (
      !annee ||
      !semestre
    ) {
      return;
    }


    const ue =
      donneesActuelles
        .structureUEParNiveau[
          annee
        ][semestre][ueIndex];


    if (!ue) {
      return;
    }


    ue.ecs.splice(
      ecIndex,
      1
    );


    chargerInterfaceBuilder();
  };


// ============================================================
// CAPTURER STRUCTURE UE / EC
// ============================================================

function capturerDonneesBuilderEnCours() {

  const cards =
    document.querySelectorAll(
      '.ue-builder-card'
    );


  // Si aucune carte n'est affichée,
  // ne pas écraser la structure.
  if (
    cards.length === 0
  ) {
    return;
  }


  const nouvelleStructure =
    [];


  cards.forEach(card => {

    const nomUEInput =
      card.querySelector(
        '.ue-code'
      );


    const libelleInput =
      card.querySelector(
        '.ue-libelle'
      );


    const creditInput =
      card.querySelector(
        '.ue-credit'
      );


    const nomUE =
      nomUEInput
        ? nomUEInput.value.trim()
        : '';


    const libelle =
      libelleInput
        ? libelleInput.value.trim()
        : '';


    const credit =
      creditInput
        ? parseInt(
            creditInput.value,
            10
          ) || 0
        : 0;


    const ecs =
      [];


    card.querySelectorAll(
      '.ec-builder-row'
    ).forEach(row => {

      const codeInput =
        row.querySelector(
          '.ec-code'
        );


      const labelInput =
        row.querySelector(
          '.ec-label'
        );


      const nom =
        codeInput
          ? codeInput.value.trim()
          : '';


      const label =
        labelInput
          ? labelInput.value.trim()
          : '';


      if (
        nom ||
        label
      ) {

        ecs.push({

          nom,

          label
        });
      }
    });


    nouvelleStructure.push({

      nomUE,

      libelle,

      credit,

      ecs
    });
  });


  const annee =
    document.getElementById(
      'anneeSelect'
    )?.value;


  const semestre =
    document.getElementById(
      'semestreSelect'
    )?.value;


  if (
    !annee ||
    !semestre
  ) {
    return;
  }


  if (
    !donneesActuelles
      .structureUEParNiveau[
        annee
      ]
  ) {

    donneesActuelles
      .structureUEParNiveau[
        annee
      ] = {};
  }


  donneesActuelles
    .structureUEParNiveau[
      annee
    ][semestre] =
    nouvelleStructure;


  const publicationBox =
    document.getElementById(
      'checkboxPublicationSemestre'
    );


  if (publicationBox) {

    if (
      !donneesActuelles
        .publicationSemestres[
          annee
        ]
    ) {

      donneesActuelles
        .publicationSemestres[
          annee
        ] = {};
    }


    donneesActuelles
      .publicationSemestres[
        annee
      ][semestre] =
      publicationBox.checked;
  }
}


// ============================================================
// 20. STATISTIQUES ADMINISTRATEUR
// ============================================================

function calculerEtAfficherStatistiquesAdmin() {

  const annee =
    document.getElementById(
      'anneeSelect'
    )?.value;

  const semestre =
    document.getElementById(
      'semestreSelect'
    )?.value;

  if (!annee || !semestre) {
    supprimerBlocStatsIfExists();
    return;
  }

  const structureSemestre =
    donneesActuelles
      .structureUEParNiveau
      ?.[annee]
      ?.[semestre] || [];

  const etudiants =
    donneesActuelles.etudiants || [];

  if (
    etudiants.length === 0 ||
    structureSemestre.length === 0
  ) {
    supprimerBlocStatsIfExists();
    return;
  }

  let totalEtudiantsEvalues = 0;
  let totalAdmis = 0;
  let sommeMoyennesClasse = 0;
  const totalSemestreCredits = 30;

  etudiants.forEach(etudiant => {

    normaliserEtudiant(etudiant);

    const notesSemestre =
      etudiant.notes
        ?.[annee]
        ?.[semestre] || {};

    const rattrapagesSemestre =
      etudiant.rattrapages
        ?.[annee]
        ?.[semestre] || {};

    const notesRattrapageSemestre =
      etudiant.notesRattrapage
        ?.[annee]
        ?.[semestre] || {};

    // Un étudiant est considéré comme évalué dès qu'au moins
    // une note régulière, un rattrapage ou une note de rattrapage
    // existe pour le semestre sélectionné.
    const aDesNotes =
      Object.keys(notesSemestre).length > 0 ||
      Object.keys(rattrapagesSemestre).length > 0 ||
      Object.keys(notesRattrapageSemestre).length > 0;

    if (!aDesNotes) {
      return;
    }

    totalEtudiantsEvalues++;

    let totalCreditsAcquis = 0;
    let totalWeightedScores = 0;

    structureSemestre.forEach(ue => {

      const resultatUE =
        calculerUE(
          etudiant,
          annee,
          semestre,
          ue
        );

      if (resultatUE.valide) {
        totalCreditsAcquis +=
          Number(ue.credit) || 0;
      }

      totalWeightedScores +=
        resultatUE.moyenneUE *
        (Number(ue.credit) || 0);
    });

    const moyenneSemestrielle =
      totalSemestreCredits > 0
        ? totalWeightedScores / totalSemestreCredits
        : 0;

    sommeMoyennesClasse += moyenneSemestrielle;

    if (totalCreditsAcquis >= 24) {
      totalAdmis++;
    }
  });

  const moyenneGeneralePromotion =
    totalEtudiantsEvalues > 0
      ? (
          sommeMoyennesClasse /
          totalEtudiantsEvalues
        ).toFixed(2)
      : "0.00";

  const tauxReussite =
    totalEtudiantsEvalues > 0
      ? (
          (
            totalAdmis /
            totalEtudiantsEvalues
          ) * 100
        ).toFixed(1)
      : "0.0";

  afficherOuMettreAJourBlocStats({
    total: totalEtudiantsEvalues,
    effectif: etudiants.length,
    admis: totalAdmis,
    taux: tauxReussite,
    moyenne: moyenneGeneralePromotion
  });
}


// ============================================================
// 20. AFFICHER STATISTIQUES
// ============================================================

function obtenirEtudiantsEvalues(annee, semestre) {

  const etudiants =
    donneesActuelles.etudiants || [];

  return etudiants.filter(etudiant => {

    normaliserEtudiant(etudiant);

    const notesSemestre =
      etudiant.notes
        ?.[annee]
        ?.[semestre] || {};

    const rattrapagesSemestre =
      etudiant.rattrapages
        ?.[annee]
        ?.[semestre] || {};

    const notesRattrapageSemestre =
      etudiant.notesRattrapage
        ?.[annee]
        ?.[semestre] || {};

    return (
      Object.keys(notesSemestre).length > 0 ||
      Object.keys(rattrapagesSemestre).length > 0 ||
      Object.keys(notesRattrapageSemestre).length > 0
    );
  });
}


function calculerResumeEtudiant(etudiant, annee, semestre) {
  normaliserEtudiant(etudiant);

  const structureSemestre =
    donneesActuelles?.structureUEParNiveau?.[annee]?.[semestre] || [];

  let totalCredits = 0;
  let creditsAcquis = 0;
  let totalPondere = 0;

  structureSemestre.forEach(ue => {
    const credit = Number(ue.credit) || 0;
    if (credit <= 0) return;

    const resultatUE = calculerUE(etudiant, annee, semestre, ue);
    totalCredits += credit;
    totalPondere += (Number(resultatUE.moyenneUE) || 0) * credit;

    if (resultatUE.valide) {
      creditsAcquis += credit;
    }
  });

  const moyenne = totalCredits > 0 ? totalPondere / totalCredits : 0;

  let statut = 'NON VALIDÉ';
  if (creditsAcquis >= 30 && moyenne >= 12) {
    statut = 'VALIDÉ';
  } else if (creditsAcquis >= 24) {
    statut = 'VALIDÉ + R';
  }

  return {
    moyenne,
    creditsAcquis,
    totalCredits,
    statut
  };
}

function obtenirNomEtudiantStats(etudiant) {
  return etudiant.nomComplet ||
    [etudiant.prenom || '', etudiant.nom || ''].join(' ').trim() ||
    'Étudiant sans nom';
}

function afficherFenetreEtudiantsEvalues(annee, semestre) {
  const anciens = document.getElementById('modalEtudiantsEvalues');
  if (anciens) anciens.remove();

  const etudiants = obtenirEtudiantsEvalues(annee, semestre);
  const echapper = valeur => String(valeur ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const lignes = etudiants.length ? etudiants.map((etudiant, index) => {
    const matricule = String(etudiant.matricule ?? '—');
    const nom = obtenirNomEtudiantStats(etudiant);
    const resume = calculerResumeEtudiant(etudiant, annee, semestre);
    const moyenne = Number(resume.moyenne || 0).toFixed(2);
    const credits = Number(resume.creditsAcquis || 0);

    return `
      <tr>
        <td>${index + 1}</td>
        <td><strong>${echapper(matricule)}</strong></td>
        <td>${echapper(nom)}</td>
        <td class="stats-table-number">${moyenne}/20</td>
        <td class="stats-table-number">${credits}/${resume.totalCredits || 30}</td>
        <td><span class="stats-status">${echapper(resume.statut)}</span></td>
        <td>
          <button type="button" class="btn-stat-bulletin" data-matricule="${echapper(matricule)}">
            Bulletin
          </button>
        </td>
      </tr>
    `;
  }).join('') : `
    <tr>
      <td colspan="7" class="stats-table-empty">Aucun étudiant évalué pour ce semestre.</td>
    </tr>
  `;

  const modal = document.createElement('div');
  modal.id = 'modalEtudiantsEvalues';
  modal.innerHTML = `
    <div class="stats-modal-backdrop"></div>
    <div class="stats-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="statsModalTitle">
      <div class="stats-modal-header">
        <div>
          <h2 id="statsModalTitle">Étudiants évalués</h2>
          <p>${etudiants.length} étudiant(s) évalué(s) — ${echapper(semestre || '')}</p>
        </div>
        <button type="button" class="stats-modal-close" aria-label="Fermer">×</button>
      </div>

      <div class="stats-table-wrapper">
        <table class="stats-students-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Matricule</th>
              <th>Nom et prénom(s)</th>
              <th>Moyenne</th>
              <th>Crédits</th>
              <th>Statut</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>${lignes}</tbody>
        </table>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const fermer = () => modal.remove();
  modal.querySelector('.stats-modal-close')?.addEventListener('click', fermer);
  modal.querySelector('.stats-modal-backdrop')?.addEventListener('click', fermer);

  modal.querySelectorAll('.btn-stat-bulletin').forEach(button => {
    button.addEventListener('click', async event => {
      event.stopPropagation();
      const matricule = button.getAttribute('data-matricule');
      const input = document.getElementById('matriculeInput');
      if (!input || !matricule || matricule === '—') return;
      input.value = matricule;
      fermer();
      if (typeof chargerBulletin === 'function') {
        await chargerBulletin();
      }
    });
  });

  const toucheEchap = event => {
    if (event.key === 'Escape') {
      fermer();
      document.removeEventListener('keydown', toucheEchap);
    }
  };
  document.addEventListener('keydown', toucheEchap);
}

function afficherOuMettreAJourBlocStats(stats) {
  let container = document.getElementById('adminStatsDashboard');

  if (!container) {
    container = document.createElement('div');
    container.id = 'adminStatsDashboard';
    const adminPanel = document.getElementById('adminPanelContainer');
    if (adminPanel) adminPanel.insertBefore(container, adminPanel.firstChild);
  }

  if (!container) return;

  const annee = document.getElementById('anneeSelect')?.value;
  const semestre = document.getElementById('semestreSelect')?.value;
  const etudiantsEvalues = obtenirEtudiantsEvalues(annee, semestre);

  container.style.cssText = `
    display:grid;
    grid-template-columns:repeat(2,minmax(0,1fr));
    gap:1rem;
    margin-bottom:1.5rem;
    align-items:stretch;
    width:100%;
    box-sizing:border-box;
  `;

  container.innerHTML = `
    <div class="stat-card-custom">
      <span class="stat-card-label">Étudiants évalués</span>
      <strong class="stat-card-value">${Number(stats.total || 0)} / ${Number(stats.effectif || 0)}</strong>
      <span class="stat-card-subtitle"> </span>
    </div>

    <div class="stat-card-custom">
      <span class="stat-card-label">Taux de réussite</span>
      <strong class="stat-card-value stat-success">${Number(stats.taux || 0).toFixed(1)}%</strong>
      <span class="stat-card-subtitle">${Number(stats.admis || 0)} étudiant(s) avec au moins 24 crédits</span>
    </div>

    <div class="stat-card-custom">
      <span class="stat-card-label">Moyenne de classe</span>
      <strong class="stat-card-value">${Number(stats.moyenne || 0).toFixed(2)}/20</strong>
      <span class="stat-card-subtitle"></span>
    </div>

    <button type="button" class="stat-card-custom stat-card-list-button" id="btnOuvrirListeEtudiants">
      <span class="stat-card-label">Liste des étudiants évalués</span>
      <strong class="stat-card-value stat-list-count">${etudiantsEvalues.length}</strong>
      <span class="stat-card-subtitle">Cliquer pour ouvrir le tableau</span>
      <span class="stat-card-arrow">›</span>
    </button>
  `;

  if (!document.getElementById('stats-dashboard-custom-style')) {
    const style = document.createElement('style');
    style.id = 'stats-dashboard-custom-style';
    style.textContent = `
      #adminStatsDashboard { width:100%; box-sizing:border-box; }
      #adminStatsDashboard .stat-card-custom {
        position:relative;
        width:100%; min-width:0; min-height:155px; box-sizing:border-box;
        background:var(--card-bg,#fff); border:1px solid var(--border,#d9dee7);
        border-radius:14px; padding:1.05rem; display:flex; flex-direction:column;
        justify-content:center; align-items:center; text-align:center; overflow:hidden;
        box-shadow:0 2px 8px rgba(0,0,0,.04);
      }
      #adminStatsDashboard .stat-card-label { display:block; font-size:.8rem; line-height:1.35; color:var(--text-muted,#667085); text-transform:uppercase; font-weight:700; }
      #adminStatsDashboard .stat-card-value { display:block; margin-top:.55rem; font-size:clamp(1.35rem,4vw,2rem); line-height:1.15; color:var(--text,#172033); white-space:normal; overflow-wrap:anywhere; }
      #adminStatsDashboard .stat-success { color:#16a34a; }
      #adminStatsDashboard .stat-card-subtitle { display:block; margin-top:.55rem; font-size:.75rem; line-height:1.4; color:var(--text-muted,#667085); }
      #adminStatsDashboard .stat-card-list-button { cursor:pointer; font:inherit; }
      #adminStatsDashboard .stat-card-list-button:hover { transform:translateY(-1px); box-shadow:0 5px 14px rgba(0,0,0,.08); }
      #adminStatsDashboard .stat-list-count { min-width:42px; height:42px; padding:0 .7rem; border-radius:50%; display:flex; align-items:center; justify-content:center; background:var(--primary,#24449a); color:#fff; }
      #adminStatsDashboard .stat-card-arrow { position:absolute; right:1rem; top:50%; transform:translateY(-50%); font-size:1.8rem; color:var(--primary,#24449a); }

      #modalEtudiantsEvalues { position:fixed; inset:0; z-index:99999; display:flex; align-items:center; justify-content:center; padding:1rem; box-sizing:border-box; }
      #modalEtudiantsEvalues .stats-modal-backdrop { position:absolute; inset:0; background:rgba(0,0,0,.55); }
      #modalEtudiantsEvalues .stats-modal-dialog { position:relative; width:min(1100px,100%); max-height:90vh; background:#fff; border-radius:16px; box-shadow:0 20px 60px rgba(0,0,0,.25); overflow:hidden; display:flex; flex-direction:column; }
      #modalEtudiantsEvalues .stats-modal-header { display:flex; align-items:center; justify-content:space-between; gap:1rem; padding:1rem 1.2rem; border-bottom:1px solid #e5e7eb; }
      #modalEtudiantsEvalues .stats-modal-header h2 { margin:0; color:#172033; font-size:1.25rem; }
      #modalEtudiantsEvalues .stats-modal-header p { margin:.3rem 0 0; color:#667085; font-size:.8rem; }
      #modalEtudiantsEvalues .stats-modal-close { width:38px; height:38px; border:0; border-radius:50%; background:#eef1f6; color:#172033; font-size:1.6rem; line-height:1; cursor:pointer; }
      #modalEtudiantsEvalues .stats-table-wrapper { overflow:auto; padding:1rem; }
      #modalEtudiantsEvalues .stats-students-table { width:100%; min-width:780px; border-collapse:separate; border-spacing:0; border:1px solid #dfe3ea; border-radius:10px; overflow:hidden; font-size:.86rem; }
      #modalEtudiantsEvalues .stats-students-table th { background:#f3f5f8; color:#344054; font-weight:700; text-align:left; padding:.8rem .7rem; border-bottom:1px solid #dfe3ea; white-space:nowrap; }
      #modalEtudiantsEvalues .stats-students-table td { padding:.75rem .7rem; border-bottom:1px solid #e9edf2; color:#344054; vertical-align:middle; }
      #modalEtudiantsEvalues .stats-students-table tbody tr:last-child td { border-bottom:0; }
      #modalEtudiantsEvalues .stats-students-table tbody tr:hover { background:#fafbfc; }
      #modalEtudiantsEvalues .stats-table-number { text-align:center; font-weight:600; white-space:nowrap; }
      #modalEtudiantsEvalues .stats-status { display:inline-block; padding:.3rem .55rem; border-radius:999px; background:#eef4ff; color:#24449a; font-weight:700; white-space:nowrap; }
      #modalEtudiantsEvalues .stats-table-empty { text-align:center; padding:2rem; color:#667085; }
      #modalEtudiantsEvalues .btn-stat-bulletin { padding:.5rem .75rem; border:0; border-radius:7px; background:#24449a; color:#fff; cursor:pointer; font-weight:700; white-space:nowrap; }

      @media (max-width:520px) {
        #adminStatsDashboard { grid-template-columns:repeat(2,minmax(0,1fr)); gap:.65rem; }
        #adminStatsDashboard .stat-card-custom { min-height:145px; padding:.7rem; }
        #adminStatsDashboard .stat-card-label { font-size:.68rem; }
        #adminStatsDashboard .stat-card-value { font-size:1.25rem; }
        #adminStatsDashboard .stat-card-subtitle { font-size:.66rem; }
        #adminStatsDashboard .stat-card-arrow { right:.55rem; font-size:1.4rem; }
        #modalEtudiantsEvalues { padding:.5rem; }
        #modalEtudiantsEvalues .stats-modal-dialog { max-height:94vh; border-radius:12px; }
        #modalEtudiantsEvalues .stats-modal-header { padding:.85rem; }
        #modalEtudiantsEvalues .stats-table-wrapper { padding:.65rem; }
      }
    `;
    document.head.appendChild(style);
  }

  document.getElementById('btnOuvrirListeEtudiants')?.addEventListener('click', () => {
    afficherFenetreEtudiantsEvalues(annee, semestre);
  });
}

// ============================================================
// 21. SUPPRIMER STATS
// ============================================================

function supprimerBlocStatsIfExists() {

  const container =
    document.getElementById(
      'adminStatsDashboard'
    );


  if (container) {

    container.remove();
  }
}


// ============================================================
// 21. CONSULTATION BULLETIN
// ============================================================

async function chargerBulletin() {

  const matriculeInput =
    document.getElementById(
      'matriculeInput'
    );


  if (!matriculeInput) {
    return;
  }


  const matricule =
    matriculeInput.value.trim();


  if (!matricule) {

    afficherErreurMatricule(
      "Veuillez entrer un numéro matricule !"
    );


    cacherBulletin();


    return;
  }


  await chargerDonneesDepuisSupabase();


  const etudiant =
    donneesActuelles.etudiants.find(
      e =>
        String(
          e.matricule
        ).toLowerCase() ===
        matricule.toLowerCase()
    );


  if (!etudiant) {

    afficherErreurMatricule(
      "Aucun(e) Étudiant(e) Identifié(e) dans cette promotion !"
    );


    cacherBulletin();


    return;
  }


  normaliserEtudiant(
    etudiant
  );


  const annee =
    document.getElementById(
      'anneeSelect'
    )?.value;


  const semestre =
    document.getElementById(
      'semestreSelect'
    )?.value;


  if (!annee || !semestre) {

    afficherErreurMatricule(
      "Veuillez sélectionner le niveau et le semestre."
    );


    cacherBulletin();


    return;
  }


  // ----------------------------------------------------------
  // Vérification publication pour étudiant
  // ----------------------------------------------------------

  if (
    currentMode !== 'admin'
  ) {

    const estPublie =
      donneesActuelles
        .publicationSemestres
        ?.[annee]
        ?.[semestre] === true;


    if (!estPublie) {

      afficherErreurMatricule(
        "Les résultats de ce semestre ne sont pas encore disponibles."
      );


      cacherBulletin();


      return;
    }
  }


  const structureSemestre =
    donneesActuelles
      .structureUEParNiveau
      ?.[annee]
      ?.[semestre] || [];


  if (
    structureSemestre.length ===
    0
  ) {

    afficherErreurMatricule(
      "Aucun résultat disponible pour ce semestre !"
    );


    cacherBulletin();


    return;
  }


  afficherErreurMatricule('');


  const filiereSelect =
    document.getElementById(
      'filiereSelect'
    );


  const filiereTexte =
    filiereSelect
      ? filiereSelect.options[
          filiereSelect.selectedIndex
        ]?.text || ''
      : '';


  const promoSelect =
    document.getElementById(
      'promotionSelect'
    );


  const promoTexte =
    promoSelect
      ? promoSelect.options[
          promoSelect.selectedIndex
        ]?.text || ''
      : '';


  afficherBulletin(

    filiereTexte,

    promoTexte,

    annee,

    semestre,

    structureSemestre,

    etudiant
  );
}


// ============================================================
// CACHER BULLETIN
// ============================================================

function cacherBulletin() {

  const bulletin =
    document.getElementById(
      'bulletinContainer'
    );


  if (bulletin) {

    bulletin.style.display =
      'none';
  }
}


// ============================================================
// 22. AFFICHAGE DU BULLETIN
// ============================================================

function afficherBulletin(
  nomFiliere,
  nomPromotion,
  annee,
  semestre,
  structureUE,
  etudiant
) {

  const resFiliere =
    document.getElementById(
      'resFiliere'
    );


  const resNiveau =
    document.getElementById(
      'resNiveau'
    );


  const resSemestre =
    document.getElementById(
      'resSemestre'
    );


  const resMatricule =
    document.getElementById(
      'resMatricule'
    );


  const resNom =
    document.getElementById(
      'resNom'
    );


  if (resFiliere) {

    resFiliere.textContent =
      `${nomFiliere} (${nomPromotion})`;
  }


  if (resNiveau) {

    resNiveau.textContent =
      annee;
  }


  if (resSemestre) {

    resSemestre.textContent =
      semestre;
  }


  if (resMatricule) {

    resMatricule.textContent =
      etudiant.matricule;
  }


  if (resNom) {

    resNom.textContent =
      etudiant.nom;
  }


  const container =
    document.getElementById(
      'uesDynamicContainer'
    );


  if (!container) {
    return;
  }


  normaliserEtudiant(
    etudiant
  );


  let tableHTML = `

    <table class="academic-table">

      <thead>

        <tr>

          <th>
            Unité d'Enseignement (UE) /
            Élément Constitutif (EC)
          </th>

          <th class="text-center">
            Crédits
          </th>

          <th class="text-center">
            Notes
          </th>

          <th class="text-center">
            Moy. UE
          </th>

          <th class="text-center">
            Statut
          </th>

        </tr>

      </thead>

      <tbody>
  `;


  let totalCreditsAcquired =
    0;


  let totalWeightedScores =
    0;


  const totalSemestreCredits =
    30;


  // ==========================================================
  // PARCOURS DES UE
  // ==========================================================

  structureUE.forEach(
    ue => {

      let ecsRowsHTML =
        '';


      let sommeNotesUE =
        0;


      let auMoinsUnRattrapage =
        false;


      const ecs =
        Array.isArray(
          ue.ecs
        )
          ? ue.ecs
          : [];


      // ========================================================
      // PARCOURS DES EC
      // ========================================================

      ecs.forEach(
        ec => {

          const noteInitiale =
            obtenirNoteInitiale(
              etudiant,
              annee,
              semestre,
              ec.nom
            );


          const noteRattrapage =
            obtenirNoteRattrapage(
              etudiant,
              annee,
              semestre,
              ec.nom
            );


          const estEnRattrapage =
            estECEnRattrapage(
              etudiant,
              annee,
              semestre,
              ec.nom
            );


          const noteEffective =
            obtenirNoteEffective(
              etudiant,
              annee,
              semestre,
              ec.nom
            );


          sommeNotesUE +=
            noteEffective;


          if (
            estEnRattrapage
          ) {

            auMoinsUnRattrapage =
              true;
          }


          // ====================================================
          // MODE ADMIN
          // ====================================================

          if (
            currentMode === 'admin'
          ) {

            const noteInitialeAffichee =
              noteInitiale !== null
                ? noteInitiale.toFixed(2)
                : '';


            const noteRattrapageAffichee =
              noteRattrapage !== null
                ? noteRattrapage.toFixed(2)
                : '';


            const peutFaireRattrapage =
              noteInitiale !== null &&
              noteInitiale < 12;


            ecsRowsHTML += `

              <tr
                class="ec-row"
                data-ec="${ec.nom}">

                <td>

                  - ${ec.label || ec.nom}

                </td>


                <td
                  class="text-center">
                </td>


                <td
                  class="text-center">

                  <div
                    style="
                      display:flex;
                      flex-direction:column;
                      gap:7px;
                      align-items:center;
                    ">

                    <!-- NOTE INITIALE -->

                    <div>

                      <small
                        style="
                          display:block;
                          color:var(--text-muted);
                        ">

                        Note initiale

                      </small>


                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="20"
                        class="input-note"
                        data-ec="${ec.nom}"
                        value="${noteInitialeAffichee}"
                        ${estEnRattrapage ? 'disabled' : ''}
                        style="max-width:100px;"
                      >

                    </div>


                    <!-- RATTRAPAGE -->

                    <label
                      style="
                        display:flex;
                        align-items:center;
                        gap:5px;
                        font-size:0.78rem;
                        cursor:${peutFaireRattrapage ? 'pointer' : 'not-allowed'};
                        color:${peutFaireRattrapage ? 'inherit' : 'var(--text-muted)'};
                      ">

                      <input
                        type="checkbox"
                        class="rattrapage-checkbox"
                        data-ec="${ec.nom}"
                        ${estEnRattrapage ? 'checked' : ''}
                        ${peutFaireRattrapage ? '' : 'disabled'}
                      >

                      Rattrapage

                    </label>


                    <!-- NOTE DE RATTRAPAGE -->

                    <div
                      class="rattrapage-note-container"
                      style="
                        display:${estEnRattrapage ? 'block' : 'none'};
                      ">

                      <small
                        style="
                          display:block;
                          color:var(--text-muted);
                        ">

                        Note de rattrapage

                      </small>


                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="20"
                        class="input-note-rattrapage"
                        data-ec-rattrapage="${ec.nom}"
                        value="${noteRattrapageAffichee}"
                        style="max-width:100px;"
                      >

                    </div>


                    ${
                      !peutFaireRattrapage &&
                      noteInitiale !== null
                      ? `
                        <small
                          style="
                            color:var(--text-muted);
                            font-size:0.70rem;
                          ">

                          EC déjà validé

                        </small>
                      `
                      : ''
                    }

                  </div>

                </td>


                <td></td>


                <td></td>

              </tr>
            `;


          } else {

            // ==================================================
            // MODE ÉTUDIANT
            // ==================================================

            ecsRowsHTML += `

              <tr
                class="ec-row">

                <td>

                  - ${ec.label || ec.nom}

                </td>


                <td
                  class="text-center">
                </td>


                <td
                  class="text-center">

                  ${noteEffective.toFixed(2)}

                </td>


                <td></td>


                <td></td>

              </tr>
            `;
          }
        }
      );


      // ========================================================
      // MOYENNE UE
      // ========================================================

      let moyenneUE =
        ecs.length > 0
          ? sommeNotesUE /
            ecs.length
          : 0;


      // ========================================================
      // PLAFONNEMENT RATTRAPAGE
      // ========================================================

      if (
        auMoinsUnRattrapage &&
        moyenneUE > 12
      ) {

        moyenneUE =
          12;
      }


      const estValide =
        moyenneUE >= 12;


      if (estValide) {

        totalCreditsAcquired +=
          Number(
            ue.credit
          ) || 0;
      }


      totalWeightedScores +=
        moyenneUE *
        (
          Number(
            ue.credit
          ) || 0
        );


      const statut =
        estValide
          ? "V"
          : "NV";


      const statusClass =
        estValide
          ? "status-v"
          : "status-nv";


      let indicationRattrapage =
        '';


      if (
        currentMode === 'admin' &&
        auMoinsUnRattrapage
      ) {

        indicationRattrapage = `

          <div
            style="
              margin-top:5px;
              font-size:0.75rem;
              color:var(--text-muted);
            ">

            ⚠️ Rattrapage sur un ou plusieurs EC
            — moyenne UE plafonnée à 12/20

          </div>
        `;
      }


      tableHTML += `

        <tr
          class="ue-row-header">

          <td>

            ${ue.nomUE} :
            ${ue.libelle || ''}

            ${indicationRattrapage}

          </td>


          <td
            class="text-center">

            ${ue.credit}

          </td>


          <td></td>


          <td
            class="text-center">

            ${moyenneUE.toFixed(2)}

          </td>


          <td
            class="text-center">

            <span
              class="${statusClass}">

              ${statut}

            </span>

          </td>

        </tr>


        ${ecsRowsHTML}
      `;
    }
  );


  tableHTML += `

      </tbody>

    </table>
  `;


  container.innerHTML =
    tableHTML;


  // ==========================================================
  // ACTIVATION DES ÉVÉNEMENTS RATTRAPAGE
  // ==========================================================

  if (
    currentMode === 'admin'
  ) {

    initialiserControlesRattrapage();
  }


  // ==========================================================
  // CALCUL SEMESTRE
  // ==========================================================

  let moyenneSemestrielle =
    totalSemestreCredits > 0
      ? totalWeightedScores /
        totalSemestreCredits
      : 0;


  let pourcentage =
    (
      totalCreditsAcquired /
      totalSemestreCredits
    ) * 100;


  let statutGlobalText =
    "NON VALIDÉ";


  let statutClassStyle =
    "status-non-valide";


  if (
    totalCreditsAcquired === 30 &&
    moyenneSemestrielle >= 12
  ) {

    statutGlobalText =
      "VALIDÉ";


    statutClassStyle =
      "status-valide";


  } else if (
    totalCreditsAcquired >= 24
  ) {

    statutGlobalText =
      "VALIDÉ + R";


    statutClassStyle =
      "status-valide";
  }


  const resCredits =
    document.getElementById(
      'resCredits'
    );


  const resPercentage =
    document.getElementById(
      'resPercentage'
    );


  const resSemestreAvg =
    document.getElementById(
      'resSemestreAvg'
    );


  const globalStatus =
    document.getElementById(
      'resGlobalStatus'
    );


  if (resCredits) {

    resCredits.textContent =
      totalCreditsAcquired;
  }


  if (resPercentage) {

    resPercentage.textContent =
      pourcentage.toFixed(1) +
      "%";
  }


  if (resSemestreAvg) {

    resSemestreAvg.textContent =
      moyenneSemestrielle.toFixed(2) +
      "/20";
  }


  if (globalStatus) {

    globalStatus.textContent =
      statutGlobalText;


    globalStatus.className =
      statutClassStyle;
  }


  const bulletin =
    document.getElementById(
      'bulletinContainer'
    );


  if (bulletin) {

    bulletin.style.display =
      'block';
  }
}


// ============================================================
// 23. GESTION DES RATTRAPAGES
// ============================================================

function validerLimiteNote(input) {
  if (!input) return;

  const valeur = String(input.value ?? '').trim().replace(',', '.');

  // Une case vide reste vide : elle pourra être supprimée de la saisie.
  if (valeur === '') {
    input.setCustomValidity('');
    return;
  }

  const note = Number(valeur);

  // Toute note hors de l'intervalle [0 ; 20] est immédiatement réinitialisée.
  if (!Number.isFinite(note) || note < 0 || note > 20) {
    input.value = '00';
    input.setCustomValidity('La note doit être comprise entre 0 et 20.');
    // Permet au navigateur de conserver un retour visuel sans bloquer les autres champs.
    setTimeout(() => input.setCustomValidity(''), 1200);
    return;
  }

  input.setCustomValidity('');
}

function initialiserLimitesNotes() {
  document
    .querySelectorAll('.input-note, .input-note-rattrapage')
    .forEach(input => {
      // Bloque aussi les valeurs >20/-valeurs introduites par collage ou clavier.
      input.addEventListener('input', () => validerLimiteNote(input));
      input.addEventListener('change', () => validerLimiteNote(input));
      input.addEventListener('blur', () => validerLimiteNote(input));

      // Contrôle également la valeur déjà présente au chargement.
      validerLimiteNote(input);
    });
}

function initialiserControlesRattrapage() {

  initialiserLimitesNotes();

  document
    .querySelectorAll(
      '.rattrapage-checkbox'
    )
    .forEach(
      checkbox => {

        gererSelectionRattrapage(
          checkbox,
          false
        );


        checkbox.addEventListener(
          'change',
          () => {

            gererSelectionRattrapage(
              checkbox,
              true
            );
          }
        );
      }
    );


  // ----------------------------------------------------------
  // Lorsque la note initiale est modifiée :
  // - si >= 12 : rattrapage interdit
  // - si < 12 : rattrapage possible
  // ----------------------------------------------------------

  document
    .querySelectorAll(
      '.input-note'
    )
    .forEach(
      input => {

        input.addEventListener(
          'input',
          () => {

            actualiserEligibiliteRattrapage(
              input
            );
          }
        );
      }
    );
}


// ============================================================
// ACTUALISER ÉLIGIBILITÉ RATTRAPAGE
// ============================================================

function actualiserEligibiliteRattrapage(
  input
) {

  const row =
    input.closest(
      '.ec-row'
    );


  if (!row) {
    return;
  }


  const checkbox =
    row.querySelector(
      '.rattrapage-checkbox'
    );


  const rattrapageContainer =
    row.querySelector(
      '.rattrapage-note-container'
    );


  if (!checkbox) {
    return;
  }


  const note =
    convertirNote(
      input.value
    );


  if (
    note !== null &&
    note >= 12
  ) {

    // --------------------------------------------------------
    // EC déjà validé
    // --------------------------------------------------------

    checkbox.checked =
      false;


    checkbox.disabled =
      true;


    input.disabled =
      false;


    if (
      rattrapageContainer
    ) {

      rattrapageContainer.style.display =
        'none';
    }


  } else {

    // --------------------------------------------------------
    // EC insuffisant
    // --------------------------------------------------------

    checkbox.disabled =
      false;


    if (
      checkbox.checked
    ) {

      input.disabled =
        true;


      if (
        rattrapageContainer
      ) {

        rattrapageContainer.style.display =
          'block';
      }

    } else {

      input.disabled =
        false;


      if (
        rattrapageContainer
      ) {

        rattrapageContainer.style.display =
          'none';
      }
    }
  }
}


// ============================================================
// CASE RATTRAPAGE
// ============================================================

window.gererSelectionRattrapage =
  function(
    checkbox,
    afficherAlerte = true
  ) {

    const ecNom =
      checkbox.getAttribute(
        'data-ec'
      );


    const row =
      checkbox.closest(
        '.ec-row'
      );


    if (!row) {
      return;
    }


    const noteInitialeInput =
      row.querySelector(
        '.input-note'
      );


    const rattrapageContainer =
      row.querySelector(
        '.rattrapage-note-container'
      );


    const noteInitiale =
      noteInitialeInput
        ? convertirNote(
            noteInitialeInput.value
          )
        : null;


    // --------------------------------------------------------
    // INTERDICTION SI NOTE >= 12
    // --------------------------------------------------------

    if (
      checkbox.checked &&
      noteInitiale !== null &&
      noteInitiale >= 12
    ) {

      checkbox.checked =
        false;


      checkbox.disabled =
        true;


      if (
        rattrapageContainer
      ) {

        rattrapageContainer.style.display =
          'none';
      }


      if (
        noteInitialeInput
      ) {

        noteInitialeInput.disabled =
          false;
      }


      if (
        afficherAlerte
      ) {

        alert(
          `L'EC ${ecNom} est déjà validé avec ${noteInitiale.toFixed(2)}/20. Il ne peut pas être sélectionné pour le rattrapage.`
        );
      }


      return;
    }


    // --------------------------------------------------------
    // RATTRAPAGE ACTIVÉ
    // --------------------------------------------------------

    if (
      checkbox.checked
    ) {

      if (
        rattrapageContainer
      ) {

        rattrapageContainer.style.display =
          'block';
      }


      if (
        noteInitialeInput
      ) {

        noteInitialeInput.disabled =
          true;
      }


    } else {

      if (
        rattrapageContainer
      ) {

        rattrapageContainer.style.display =
          'none';
      }


      if (
        noteInitialeInput
      ) {

        noteInitialeInput.disabled =
          false;
      }
    }
  };


// ============================================================
// 24. ENREGISTREMENT DES NOTES
// ============================================================

async function enregistrerNotes() {

  const resMatricule =
    document.getElementById(
      'resMatricule'
    );


  if (!resMatricule) {
    return;
  }


  const matricule =
    resMatricule.textContent.trim();


  if (!matricule) {
    return;
  }


  const etudiant =
    donneesActuelles.etudiants.find(
      e =>
        String(
          e.matricule
        ).toLowerCase() ===
        matricule.toLowerCase()
    );


  if (!etudiant) {

    alert(
      "Étudiant introuvable."
    );

    return;
  }


  normaliserEtudiant(
    etudiant
  );


  const annee =
    document.getElementById(
      'anneeSelect'
    )?.value;


  const semestre =
    document.getElementById(
      'semestreSelect'
    )?.value;


  if (
    !annee ||
    !semestre
  ) {
    return;
  }


  // ==========================================================
  // INITIALISATION DES STRUCTURES
  // ==========================================================

  if (
    !etudiant.notes[annee]
  ) {

    etudiant.notes[annee] =
      {};
  }


  if (
    !etudiant.notes[annee][semestre]
  ) {

    etudiant.notes[annee][semestre] =
      {};
  }


  if (
    !etudiant.rattrapages[annee]
  ) {

    etudiant.rattrapages[annee] =
      {};
  }


  if (
    !etudiant.rattrapages[
      annee
    ][semestre]
  ) {

    etudiant.rattrapages[
      annee
    ][semestre] =
      {};
  }


  if (
    !etudiant.notesRattrapage[
      annee
    ]
  ) {

    etudiant.notesRattrapage[
      annee
    ] =
      {};
  }


  if (
    !etudiant.notesRattrapage[
      annee
    ][semestre]
  ) {

    etudiant.notesRattrapage[
      annee
    ][semestre] =
      {};
  }


  const notes =
    etudiant.notes[
      annee
    ][semestre];


  const rattrapages =
    etudiant.rattrapages[
      annee
    ][semestre];


  const notesRattrapage =
    etudiant.notesRattrapage[
      annee
    ][semestre];


  // ==========================================================
  // 1. NOTES INITIALES
  // ==========================================================

  document
    .querySelectorAll(
      '.input-note'
    )
    .forEach(
      input => {

        const ecNom =
          input.getAttribute(
            'data-ec'
          );


        if (!ecNom) {
          return;
        }


        const valeur =
          input.value.trim();


        if (
          valeur === ''
        ) {

          delete notes[
            ecNom
          ];

          return;
        }


        const note =
          convertirNote(
            valeur
          );


        if (
          note === null
        ) {

          delete notes[
            ecNom
          ];

        } else {

          notes[
            ecNom
          ] =
            note;
        }
      }
    );


  // ==========================================================
  // 2. RATTRAPAGES EC PAR EC
  // ==========================================================

  document
    .querySelectorAll(
      '.rattrapage-checkbox'
    )
    .forEach(
      checkbox => {

        const ecNom =
          checkbox.getAttribute(
            'data-ec'
          );


        if (!ecNom) {
          return;
        }


        const noteInitiale =
          convertirNote(
            notes[ecNom]
          );


        // ------------------------------------------------------
        // EC >= 12
        // ------------------------------------------------------

        if (
          noteInitiale !== null &&
          noteInitiale >= 12
        ) {

          rattrapages[
            ecNom
          ] =
            false;


          delete notesRattrapage[
            ecNom
          ];


          return;
        }


        // ------------------------------------------------------
        // EC < 12
        // ------------------------------------------------------

        if (
          checkbox.checked
        ) {

          rattrapages[
            ecNom
          ] =
            true;


          const inputRattrapage =
            document.querySelector(
              `.input-note-rattrapage[data-ec-rattrapage="${CSS.escape(ecNom)}"]`
            );


          if (
            inputRattrapage
          ) {

            const valeur =
              inputRattrapage.value.trim();


            if (
              valeur === ''
            ) {

              delete notesRattrapage[
                ecNom
              ];

            } else {

              const noteR =
                convertirNote(
                  valeur
                );


              if (
                noteR !== null
              ) {

                notesRattrapage[
                  ecNom
                ] =
                  noteR;

              } else {

                delete notesRattrapage[
                  ecNom
                ];
              }
            }
          }

        } else {

          rattrapages[
            ecNom
          ] =
            false;


          delete notesRattrapage[
            ecNom
          ];
        }
      }
    );


  // ==========================================================
  // 3. NETTOYAGE DES FALSE INUTILES
  // ==========================================================

  Object.keys(
    rattrapages
  ).forEach(
    ecNom => {

      if (
        rattrapages[
          ecNom
        ] !== true
      ) {

        delete rattrapages[
          ecNom
        ];
      }
    }
  );


  // ==========================================================
  // 4. SAUVEGARDE
  // ==========================================================

  const sauvegarde =
    await window.sauvegarderDonneesVersSupabase();


  if (!sauvegarde) {
    return;
  }


  // ==========================================================
  // 5. RAFRAÎCHISSEMENT
  // ==========================================================

  const structureSemestre =
    donneesActuelles
      .structureUEParNiveau
      ?.[annee]
      ?.[semestre] || [];


  const filiereSelect =
    document.getElementById(
      'filiereSelect'
    );


  const filiereTexte =
    filiereSelect
      ? filiereSelect.options[
          filiereSelect.selectedIndex
        ]?.text || ''
      : '';


  const promoSelect =
    document.getElementById(
      'promotionSelect'
    );


  const promoTexte =
    promoSelect
      ? promoSelect.options[
          promoSelect.selectedIndex
        ]?.text || ''
      : '';


  afficherBulletin(

    filiereTexte,

    promoTexte,

    annee,

    semestre,

    structureSemestre,

    etudiant
  );


  calculerEtAfficherStatistiquesAdmin();


  alert(
    "Les notes et les éventuels rattrapages EC ont été enregistrés avec succès."
  );
}


// ============================================================
// 25. CHANGEMENT DE CONTEXTE
// ============================================================

async function gererChangementContexte(
  id
) {

  if (
    id ===
    'anneeSelect'
  ) {

    mettreAJourSemestres();
  }


  await chargerDonneesDepuisSupabase();


  if (
    currentMode === 'admin'
  ) {

    chargerInterfaceAdmin();
  }


  cacherBulletin();


  afficherErreurMatricule('');
}


// ============================================================
// 26. INITIALISATION DES ÉVÉNEMENTS
// ============================================================
//
// IMPORTANT :
// Tout est placé dans DOMContentLoaded.
// Cela évite que les boutons soient recherchés
// avant que le HTML existe.
// ============================================================

window.addEventListener(
  'DOMContentLoaded',
  () => {

    // --------------------------------------------------------
    // Initialisation visuelle
    // --------------------------------------------------------

    initialiserInterface();


    // --------------------------------------------------------
    // MODE ÉTUDIANT
    // --------------------------------------------------------

    const btnStudent =
      document.getElementById(
        'btnModeStudent'
      );


    if (btnStudent) {

      btnStudent.addEventListener(
        'click',
        activerModeEtudiant
      );
    }


    // --------------------------------------------------------
    // MODE ADMIN
    // --------------------------------------------------------

    const btnAdmin =
      document.getElementById(
        'btnAdminMode'
      );


    if (btnAdmin) {

      btnAdmin.addEventListener(
        'click',
        ouvrirConnexionAdmin
      );
    }


    // --------------------------------------------------------
    // MODAL ADMIN
    // --------------------------------------------------------

    const {
      modal,
      cancel,
      submit,
      email,
      password
    } =
      obtenirElementsAuth();


    if (cancel) {

      cancel.addEventListener(
        'click',
        fermerAdminModal
      );
    }


    if (submit) {

      submit.addEventListener(
        'click',
        executerConnexionAdmin
      );
    }


    if (email) {

      email.addEventListener(
        'keydown',
        event => {

          if (
            event.key ===
            'Enter'
          ) {

            executerConnexionAdmin();
          }
        }
      );
    }


    if (password) {

      password.addEventListener(
        'keydown',
        event => {

          if (
            event.key ===
            'Enter'
          ) {

            executerConnexionAdmin();
          }
        }
      );
    }


    // --------------------------------------------------------
    // Clic extérieur modal
    // --------------------------------------------------------

    window.addEventListener(
      'click',
      event => {

        if (
          modal &&
          event.target ===
          modal
        ) {

          fermerAdminModal();
        }
      }
    );


    // --------------------------------------------------------
    // Escape
    // --------------------------------------------------------

    window.addEventListener(
      'keydown',
      event => {

        if (
          event.key ===
          'Escape'
        ) {

          if (
            modal &&
            modal.style.display ===
            'flex'
          ) {

            fermerAdminModal();
          }
        }
      }
    );


    // --------------------------------------------------------
    // Déconnexion
    // --------------------------------------------------------

    const btnDeconnexion =
      document.getElementById(
        'btnDeconnexion'
      );


    if (btnDeconnexion) {

      btnDeconnexion.addEventListener(
        'click',
        deconnecterAdmin
      );
    }


    // --------------------------------------------------------
    // Bouton ajouter étudiant
    // --------------------------------------------------------

    const addStudentBtn =
      document.getElementById(
        'addStudentBtn'
      );


    if (addStudentBtn) {

      addStudentBtn.addEventListener(
        'click',
        ajouterEtudiant
      );
    }


    // --------------------------------------------------------
    // Bouton charger bulletin
    // --------------------------------------------------------

    const actionBtn =
      document.getElementById(
        'actionBtn'
      );


    if (actionBtn) {

      actionBtn.addEventListener(
        'click',
        chargerBulletin
      );
    }


    // --------------------------------------------------------
    // Sauvegarder notes
    // --------------------------------------------------------

    const saveChangesBtn =
      document.getElementById(
        'saveChangesBtn'
      );


    if (saveChangesBtn) {

      saveChangesBtn.addEventListener(
        'click',
        enregistrerNotes
      );
    }


    // --------------------------------------------------------
    // Ajouter UE
    // --------------------------------------------------------

    const btnAjouterUE =
      document.getElementById(
        'btnAjouterUE'
      );


    if (btnAjouterUE) {

      btnAjouterUE.addEventListener(
        'click',
        window.ajouterUE
      );
    }


    // --------------------------------------------------------
    // Sauvegarder configuration
    // --------------------------------------------------------

    const btnSauvegarderConfig =
      document.getElementById(
        'btnSauvegarderConfig'
      );


    if (btnSauvegarderConfig) {

      btnSauvegarderConfig.addEventListener(
        'click',
        window.sauvegarderDonneesVersSupabase
      );
    }


    // --------------------------------------------------------
    // Changements filière / promotion / niveau / semestre
    // --------------------------------------------------------

    [
      'filiereSelect',
      'promotionSelect',
      'anneeSelect',
      'semestreSelect'
    ].forEach(
      id => {

        const element =
          document.getElementById(
            id
          );


        if (element) {

          element.addEventListener(
            'change',
            () =>
              gererChangementContexte(
                id
              )
          );
        }
      }
    );


    // --------------------------------------------------------
    // État Supabase
    // --------------------------------------------------------

    if (_supabase) {

      _supabase.auth.onAuthStateChange(
        (
          event,
          session
        ) => {

          console.log(
            "État authentification Supabase :",
            event
          );


          if (
            event ===
            'SIGNED_OUT'
          ) {

            if (
              currentMode ===
              'admin'
            ) {

              activerModeEtudiant();
            }
          }


          if (
            event ===
            'SIGNED_IN' &&
            session
          ) {

            console.log(
              "Session administrateur active."
            );
          }
        }
      );
    }

  }
);


// ============================================================
// 27. VÉRIFICATION AUTOMATIQUE DE SESSION
// ============================================================

window.addEventListener(
  'DOMContentLoaded',
  async () => {

    if (!_supabase) {
      return;
    }


    try {

      const {
        data,
        error
      } =
        await _supabase.auth.getSession();


      if (error) {

        console.error(
          "Erreur récupération session :",
          error
        );

        return;
      }


      if (
        data &&
        data.session
      ) {

        // On ne bascule pas automatiquement
        // en admin pour éviter de surprendre
        // l'utilisateur.
        console.log(
          "Une session Supabase existe déjà."
        );
      }


    } catch (error) {

      console.error(
        "Erreur session :",
        error
      );
    }
  }
);
