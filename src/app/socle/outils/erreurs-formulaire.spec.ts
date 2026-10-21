import { estCourrielValide, estTelephoneValide, lireErreursServeur, MESSAGE_CHAMPS_EN_ROUGE } from './erreurs-formulaire';

describe('Lecture des erreurs de validation du backend', () => {
  it('place chaque erreur sous son champ, avec le nom du champ du formulaire', () => {
    const resultat = lireErreursServeur(
      { status: 400, error: { telephone: ['Ce numéro est déjà utilisé.'], mot_de_passe: ['Trop court.'] } },
      { mot_de_passe: 'motDePasse' }
    );
    expect(resultat.champs).toEqual({ telephone: 'Ce numéro est déjà utilisé.', motDePasse: 'Trop court.' });
    expect(resultat.message).toBe(MESSAGE_CHAMPS_EN_ROUGE);
  });

  it("affiche le message d'une erreur métier dans le bandeau", () => {
    const resultat = lireErreursServeur({ status: 400, error: { code: 'code_expire', message: 'Code expiré.' } });
    expect(resultat).toEqual({ message: 'Code expiré.', champs: {} });
  });

  it('explique les erreurs réseau et de limitation', () => {
    expect(lireErreursServeur({ status: 0 }).message).toContain('connexion');
    expect(lireErreursServeur({ status: 429 }).message).toContain('Patientez');
  });

  it("n'affiche jamais une page HTML d'erreur brute", () => {
    expect(lireErreursServeur({ status: 500, error: '<html>Server Error</html>' }, {}, 'Erreur.').message).toBe('Erreur.');
  });

  it('contrôle e-mail et téléphone comme le backend', () => {
    expect(estCourrielValide('fatou@gmail.com')).toBe(true);
    expect(estCourrielValide('fatou@gmail')).toBe(false);
    expect(estTelephoneValide('+221 77 123 45 67')).toBe(true);
    expect(estTelephoneValide('77-12')).toBe(false);
  });
});
