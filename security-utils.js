// ============================================================
// UTILITAIRES DE SÉCURITÉ
// ============================================================
// Module de sécurité centralisé pour :
// - Validation des entrées
// - Prévention XSS
// - Gestion sécurisée du storage
// ============================================================

/**
 * Échappe les caractères HTML spéciaux
 * @param {string} texte - Texte à échapper
 * @returns {string} Texte échappé
 */
function echapperHTML(texte) {
  if (!texte || typeof texte !== 'string') {
    return '';
  }

  const div = document.createElement('div');
  div.textContent = texte;
  return div.innerHTML;
}

/**
 * Nettoie le contenu HTML en supprimant les scripts malveillants
 * @param {string} html - HTML à nettoyer
 * @returns {string} HTML nettoyé
 */
function nettoyerHTML(html) {
  if (!html || typeof html !== 'string') {
    return '';
  }

  const element = document.createElement('div');
  element.innerHTML = html;

  // Supprime tous les scripts
  const scripts = element.querySelectorAll('script');
  scripts.forEach(script => script.remove());

  // Supprime les event handlers
  const elements = element.querySelectorAll('*');
  elements.forEach(el => {
    Array.from(el.attributes).forEach(attr => {
      if (attr.name.startsWith('on')) {
        el.removeAttribute(attr.name);
      }
    });
  });

  return element.innerHTML;
}

/**
 * Insère du texte de manière sûre (prévention XSS)
 * @param {HTMLElement} element - Élément DOM
 * @param {string} texte - Texte à insérer
 */
function insererTexteSecurise(element, texte) {
  if (!element) return;
  element.textContent = texte || '';
}

/**
 * Insère du HTML nettoyé de manière sûre
 * @param {HTMLElement} element - Élément DOM
 * @param {string} html - HTML à insérer
 */
function insererHTMLSecurise(element, html) {
  if (!element) return;
  element.innerHTML = nettoyerHTML(html);
}

// ============================================================
// VALIDATION DES ENTRÉES
// ============================================================

/**
 * Valide le matricule (9 chiffres uniquement)
 * @param {string} matricule - Matricule à valider
 * @returns {object} {valide: boolean, erreur: string}
 */
function validerMatricule(matricule) {
  if (!matricule || typeof matricule !== 'string') {
    return {
      valide: false,
      erreur: 'Le matricule doit être une chaîne de caractères.'
    };
  }

  const matriculeNettoye = matricule.trim();

  if (matriculeNettoye.length !== 9) {
    return {
      valide: false,
      erreur: 'Le matricule doit contenir exactement 9 caractères.'
    };
  }

  if (!/^\d{9}$/.test(matriculeNettoye)) {
    return {
      valide: false,
      erreur: 'Le matricule doit contenir uniquement des chiffres.'
    };
  }

  return {
    valide: true,
    erreur: ''
  };
}

/**
 * Valide le nom étudiant
 * @param {string} nom - Nom à valider
 * @returns {object} {valide: boolean, erreur: string}
 */
function validerNom(nom) {
  if (!nom || typeof nom !== 'string') {
    return {
      valide: false,
      erreur: 'Le nom doit être une chaîne de caractères.'
    };
  }

  const nomNettoye = nom.trim();

  if (nomNettoye.length === 0) {
    return {
      valide: false,
      erreur: 'Le nom ne peut pas être vide.'
    };
  }

  if (nomNettoye.length > 200) {
    return {
      valide: false,
      erreur: 'Le nom ne peut pas dépasser 200 caractères.'
    };
  }

  // Autorise lettres, espaces, tirets, apostrophes, accents
  if (!/^[a-zA-ZÀ-ÿ\s\-']*$/.test(nomNettoye)) {
    return {
      valide: false,
      erreur: 'Le nom contient des caractères non autorisés.'
    };
  }

  return {
    valide: true,
    erreur: ''
  };
}

/**
 * Valide le mot de passe administrateur
 * - Minimum 10 caractères
 * - Peut inclure majuscules, minuscules, chiffres, caractères spéciaux
 * @param {string} motDePasse - Mot de passe à valider
 * @returns {object} {valide: boolean, erreur: string, force: string}
 */
function validerMotDePasse(motDePasse) {
  if (!motDePasse || typeof motDePasse !== 'string') {
    return {
      valide: false,
      erreur: 'Le mot de passe doit être une chaîne de caractères.',
      force: 'faible'
    };
  }

  if (motDePasse.length < 10) {
    return {
      valide: false,
      erreur: 'Le mot de passe doit contenir au moins 10 caractères.',
      force: 'faible'
    };
  }

  if (motDePasse.length > 128) {
    return {
      valide: false,
      erreur: 'Le mot de passe ne peut pas dépasser 128 caractères.',
      force: 'faible'
    };
  }

  // Caractères interdits : < > " ' ` qui pourraient être utilisés pour l'injection
  if (/<|>|"|'|`/.test(motDePasse)) {
    return {
      valide: false,
      erreur: 'Le mot de passe contient des caractères interdits.',
      force: 'faible'
    };
  }

  // Évaluer la force du mot de passe
  let force = 'faible';
  let criteres = 0;

  if (/[a-z]/.test(motDePasse)) criteres++;
  if (/[A-Z]/.test(motDePasse)) criteres++;
  if (/\d/.test(motDePasse)) criteres++;
  if (/[@$!%*?&\-_.~^()[\]{}=+;:,<>?/\\|`!@#$%^&*]/.test(motDePasse)) criteres++;

  if (criteres === 3) force = 'moyen';
  if (criteres === 4) force = 'fort';

  return {
    valide: true,
    erreur: '',
    force: force
  };
}

/**
 * Valide une note
 * @param {string|number} valeur - Note à valider
 * @returns {number|null} Note valide ou null
 */
function convertirNoteSecurisee(valeur) {
  if (
    valeur === undefined ||
    valeur === null ||
    valeur === ''
  ) {
    return null;
  }

  const nombre = parseFloat(String(valeur).replace(',', '.'));

  if (!Number.isFinite(nombre)) {
    return null;
  }

  if (nombre < 0 || nombre > 20) {
    return null;
  }

  return nombre;
}

// ============================================================
// GESTION SÉCURISÉE DU STORAGE
// ============================================================

/**
 * Stocke une valeur de manière sécurisée
 * @param {string} cle - Clé de stockage
 * @param {any} valeur - Valeur à stocker
 * @param {string} type - 'localStorage' ou 'sessionStorage'
 */
function stockerSecurise(cle, valeur, type = 'localStorage') {
  try {
    if (!cle || typeof cle !== 'string') {
      console.error('Clé de stockage invalide');
      return false;
    }

    const storage = type === 'sessionStorage' ? sessionStorage : localStorage;

    // Sérialiser la valeur
    const valeurSerialisee = JSON.stringify({
      valeur: valeur,
      horodatage: Date.now()
    });

    storage.setItem(cle, valeurSerialisee);
    return true;
  } catch (error) {
    console.error(`Erreur stockage ${type}:`, error);
    return false;
  }
}

/**
 * Récupère une valeur du storage de manière sécurisée
 * @param {string} cle - Clé de stockage
 * @param {string} type - 'localStorage' ou 'sessionStorage'
 * @returns {any} Valeur stockée ou null
 */
function recupererSecurise(cle, type = 'localStorage') {
  try {
    if (!cle || typeof cle !== 'string') {
      return null;
    }

    const storage = type === 'sessionStorage' ? sessionStorage : localStorage;
    const donnees = storage.getItem(cle);

    if (!donnees) {
      return null;
    }

    const objet = JSON.parse(donnees);
    return objet.valeur || null;
  } catch (error) {
    console.error(`Erreur récupération ${type}:`, error);
    return null;
  }
}

/**
 * Supprime une valeur du storage
 * @param {string} cle - Clé à supprimer
 * @param {string} type - 'localStorage' ou 'sessionStorage'
 */
function supprimerDuStorage(cle, type = 'localStorage') {
  try {
    const storage = type === 'sessionStorage' ? sessionStorage : localStorage;
    storage.removeItem(cle);
    return true;
  } catch (error) {
    console.error(`Erreur suppression ${type}:`, error);
    return false;
  }
}

/**
 * Vide complètement le storage de manière sécurisée
 * @param {string} type - 'localStorage', 'sessionStorage' ou 'all'
 */
function viderStorageSecurise(type = 'all') {
  try {
    if (type === 'localStorage' || type === 'all') {
      localStorage.clear();
    }

    if (type === 'sessionStorage' || type === 'all') {
      sessionStorage.clear();
    }

    return true;
  } catch (error) {
    console.error('Erreur vidage storage:', error);
    return false;
  }
}

/**
 * Efface les données d'authentification sensibles
 */
function effacerDonneesAuth() {
  const clesCles = [
    'supabase.auth.token',
    'sb-',
    'auth_token',
    'admin_session'
  ];

  try {
    // localStorage
    Object.keys(localStorage).forEach(cle => {
      if (clesCles.some(cl => cle.includes(cl))) {
        localStorage.removeItem(cle);
      }
    });

    // sessionStorage
    Object.keys(sessionStorage).forEach(cle => {
      if (clesCles.some(cl => cle.includes(cl))) {
        sessionStorage.removeItem(cle);
      }
    });

    return true;
  } catch (error) {
    console.error('Erreur effacement données auth:', error);
    return false;
  }
}

// ============================================================
// LIMITATION DE DÉBIT (RATE LIMITING)
// ============================================================

/**
 * Gestionnaire de limitation de débit
 */
class GestionnaireLimitationDebit {
  constructor() {
    this.tentatives = new Map();
  }

  /**
   * Vérifie si une action est autorisée
   * @param {string} cle - Identifiant unique (email, IP, etc.)
   * @param {number} maxTentatives - Nombre max de tentatives
   * @param {number} fenetre - Fenêtre de temps en ms
   * @returns {object} {autorisee: boolean, message: string, attente: number}
   */
  verifier(cle, maxTentatives = 5, fenetre = 15 * 60 * 1000) {
    const maintenant = Date.now();

    if (!this.tentatives.has(cle)) {
      this.tentatives.set(cle, []);
    }

    let tentativesCles = this.tentatives.get(cle);

    // Supprimer les tentatives en dehors de la fenêtre
    tentativesCles = tentativesCles.filter(t => maintenant - t < fenetre);
    this.tentatives.set(cle, tentativesCles);

    if (tentativesCles.length >= maxTentatives) {
      const tempsRestant = Math.ceil(
        (tentativesCles[0] + fenetre - maintenant) / 1000
      );

      return {
        autorisee: false,
        message: `Trop de tentatives. Réessayez dans ${tempsRestant} secondes.`,
        attente: tempsRestant
      };
    }

    tentativesCles.push(maintenant);
    this.tentatives.set(cle, tentativesCles);

    return {
      autorisee: true,
      message: '',
      attente: 0
    };
  }

  /**
   * Réinitialise les tentatives pour une clé
   * @param {string} cle - Identifiant unique
   */
  reinitialiser(cle) {
    this.tentatives.delete(cle);
  }

  /**
   * Nettoie les entrées expirées
   */
  nettoyer() {
    const maintenant = Date.now();
    const fenetre = 15 * 60 * 1000;

    for (const [cle, tentatives] of this.tentatives.entries()) {
      const tentativesValides = tentatives.filter(
        t => maintenant - t < fenetre
      );

      if (tentativesValides.length === 0) {
        this.tentatives.delete(cle);
      } else {
        this.tentatives.set(cle, tentativesValides);
      }
    }
  }
}

// Instance globale
const limitationDebit = new GestionnaireLimitationDebit();

// Nettoyer chaque 5 minutes
setInterval(() => limitationDebit.nettoyer(), 5 * 60 * 1000);
