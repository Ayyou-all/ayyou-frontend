/**
 * Lecture des erreurs de validation renvoyées par le backend Django.
 *
 * Le backend répond de deux façons :
 * - erreurs par champ : { "telephone": ["Numéro invalide."], "courriel": ["..."] }
 * - erreur métier :     { "code": "...", "message": "..." }
 *
 * Les erreurs par champ s'affichent sous le champ concerné (entouré en rouge),
 * le message général dans le bandeau en haut du formulaire.
 */

export type ErreursChamps = Record<string, string>;

export interface ErreursFormulaire {
  message: string;
  champs: ErreursChamps;
}

export const MESSAGE_CHAMPS_EN_ROUGE = 'Certains champs sont incorrects : corrigez les champs en rouge.';

/**
 * @param correspondance nom du champ côté backend -> nom du champ dans le formulaire
 *                       (ex. { telephone_contact: 'telephone' }). Par défaut le même nom.
 */
export function lireErreursServeur(
  erreur: any,
  correspondance: Record<string, string> = {},
  messageParDefaut = 'Une erreur est survenue. Veuillez réessayer.'
): ErreursFormulaire {
  if (erreur?.status === 0) {
    return { message: 'Impossible de contacter le serveur. Vérifiez votre connexion internet.', champs: {} };
  }
  if (erreur?.status === 429) {
    return { message: 'Trop de tentatives. Patientez une minute avant de réessayer.', champs: {} };
  }

  const corps = erreur?.error;
  if (typeof corps === 'string' && corps.trim() && !corps.trim().startsWith('<')) {
    return { message: corps, champs: {} };
  }
  if (!corps || typeof corps !== 'object') {
    return { message: messageParDefaut, champs: {} };
  }
  if (typeof corps.message === 'string' && corps.message) {
    return { message: corps.message, champs: {} };
  }

  const champs: ErreursChamps = {};
  let messageGeneral = '';
  for (const [cle, valeur] of Object.entries(corps)) {
    const texte = Array.isArray(valeur) ? String(valeur[0] ?? '') : typeof valeur === 'string' ? valeur : '';
    if (!texte) continue;
    if (cle === 'detail' || cle === 'non_field_errors') {
      messageGeneral = texte;
    } else {
      champs[correspondance[cle] ?? cle] = texte;
    }
  }
  if (Object.keys(champs).length > 0) {
    return { message: messageGeneral || MESSAGE_CHAMPS_EN_ROUGE, champs };
  }
  return { message: messageGeneral || messageParDefaut, champs };
}

/** Adresse e-mail plausible (le backend fait le contrôle définitif). */
export function estCourrielValide(courriel: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((courriel || '').trim());
}

/** Même règle que le backend : chiffres et espaces, « + » en tête autorisé, 9 à 20 caractères. */
export function estTelephoneValide(telephone: string): boolean {
  return /^\+?[0-9 ]{9,20}$/.test((telephone || '').trim());
}
