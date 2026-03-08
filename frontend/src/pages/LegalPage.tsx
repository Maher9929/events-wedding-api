import { useNavigate, useSearchParams } from 'react-router-dom';

const LegalPage = () => {
    const [searchParams] = useSearchParams();
    const section = searchParams.get('section') || 'terms';
    const navigate = useNavigate();

    const sections = [
        { id: 'terms', title: 'Conditions Générales d\'Utilisation', icon: 'fa-file-contract' },
        { id: 'privacy', title: 'Politique de Confidentialité', icon: 'fa-shield-alt' },
        { id: 'cookies', title: 'Politique de Cookies', icon: 'fa-cookie' },
        { id: 'cgv', title: 'Conditions Générales de Vente', icon: 'fa-handshake' },
        { id: 'kyc', title: 'Politique KYC', icon: 'fa-user-check' },
        { id: 'moderation', title: 'Politique de Modération', icon: 'fa-gavel' },
    ];

    const currentSection = sections.find(s => s.id === section) || sections[0];

    return (
        <div className="min-h-screen bg-bglight">
            <div className="max-w-6xl mx-auto p-5">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-primary font-bold mb-4"
                    >
                        <i className="fa-solid fa-arrow-left"></i>
                        Retour
                    </button>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Mentions Légales
                    </h1>
                    <p className="text-gray-600">
                        Consultez nos documents légaux et politiques de conformité
                    </p>
                </div>

                {/* Navigation */}
                <div className="bg-white rounded-3xl shadow-sm p-6 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {sections.map(sec => (
                            <button
                                key={sec.id}
                                onClick={() => navigate(`/legal?section=${sec.id}`)}
                                className={`p-4 rounded-xl text-left transition-all ${currentSection.id === sec.id
                                        ? 'bg-primary text-white shadow-md'
                                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <i className={`fa-solid ${sec.icon} text-lg`}></i>
                                    <span className="font-bold">{sec.title}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="bg-white rounded-3xl shadow-sm p-8">
                    <div className="prose prose-lg max-w-none">
                        {currentSection.id === 'terms' && (
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                                    Conditions Générales d'Utilisation
                                </h2>
                                <div className="space-y-6 text-gray-700">
                                    <section>
                                        <h3 className="text-xl font-bold text-gray-900 mb-3">1. Objet</h3>
                                        <p>
                                            Les présentes Conditions Générales d'Utilisation (CGU) régissent l'utilisation de la plateforme
                                            Dousha, marketplace spécialisée dans l'organisation d'événements et la mise en relation
                                            entre prestataires de services et clients.
                                        </p>
                                    </section>
                                    <section>
                                        <h3 className="text-xl font-bold text-gray-900 mb-3">2. Acceptation des CGU</h3>
                                        <p>
                                            L'accès et l'utilisation de la plateforme Dousha impliquent l'acceptation pleine et entière
                                            des présentes CGU. Si vous n'acceptez pas ces conditions, vous ne devez pas utiliser la plateforme.
                                        </p>
                                    </section>
                                    <section>
                                        <h3 className="text-xl font-bold text-gray-900 mb-3">3. Inscription et Compte</h3>
                                        <p>
                                            Pour accéder à certaines fonctionnalités, vous devez créer un compte en fournissant des
                                            informations exactes et complètes. Vous êtes responsable de la confidentialité de vos
                                            identifiants de connexion.
                                        </p>
                                    </section>
                                    <section>
                                        <h3 className="text-xl font-bold text-gray-900 mb-3">4. Rôles et Responsabilités</h3>
                                        <div className="space-y-3">
                                            <p><strong>Clients :</strong> Peuvent rechercher des prestataires, demander des devis,
                                                réserver des services et laisser des avis.</p>
                                            <p><strong>Prestataires :</strong> Peuvent proposer des services, répondre aux demandes de devis,
                                                gérer leurs réservations et recevoir des paiements.</p>
                                            <p><strong>Administrateurs :</strong> Gèrent la plateforme, modèrent le contenu et assurent
                                                le bon fonctionnement du service.</p>
                                        </div>
                                    </section>
                                    <section>
                                        <h3 className="text-xl font-bold text-gray-900 mb-3">5. Services et Prestations</h3>
                                        <p>
                                            Les prestataires sont responsables de la qualité des services proposés. Dousha agit
                                            comme intermédiaire et n'est pas responsable des litiges entre clients et prestataires.
                                        </p>
                                    </section>
                                    <section>
                                        <h3 className="text-xl font-bold text-gray-900 mb-3">6. Paiements et Commissions</h3>
                                        <p>
                                            Les paiements sont sécurisés via Stripe. Dousha perçoit une commission sur chaque
                                            transaction réussie. Les conditions de paiement sont détaillées dans les CGV.
                                        </p>
                                    </section>
                                    <section>
                                        <h3 className="text-xl font-bold text-gray-900 mb-3">7. Propriété Intellectuelle</h3>
                                        <p>
                                            Tous les contenus de la plateforme (textes, images, logos) sont protégés par le
                                            droit de la propriété intellectuelle et appartiennent à Dousha ou à leurs auteurs.
                                        </p>
                                    </section>
                                    <section>
                                        <h3 className="text-xl font-bold text-gray-900 mb-3">8. Confidentialité</h3>
                                        <p>
                                            Nous nous engageons à protéger vos données personnelles conformément à notre
                                            Politique de Confidentialité.
                                        </p>
                                    </section>
                                    <section>
                                        <h3 className="text-xl font-bold text-gray-900 mb-3">9. Modération et Contenu</h3>
                                        <p>
                                            Nous nous réservons le droit de modérer ou supprimer tout contenu non conforme.
                                            Les utilisateurs peuvent signaler des contenus inappropriés via notre système de signalement.
                                        </p>
                                    </section>
                                    <section>
                                        <h3 className="text-xl font-bold text-gray-900 mb-3">10. Responsabilité</h3>
                                        <p>
                                            Dousha n'est pas responsable des dommages directs ou indirects résultant de l'utilisation
                                            de la plateforme. Notre responsabilité est limitée aux montants perçus pour le service.
                                        </p>
                                    </section>
                                    <section>
                                        <h3 className="text-xl font-bold text-gray-900 mb-3">11. Résiliation</h3>
                                        <p>
                                            Nous nous réservons le droit de résilier ou suspendre des comptes en cas de violation
                                            des présentes CGU. Les utilisateurs peuvent également résilier leur compte à tout moment.
                                        </p>
                                    </section>
                                    <section>
                                        <h3 className="text-xl font-bold text-gray-900 mb-3">12. Modifications</h3>
                                        <p>
                                            Nous nous réservons le droit de modifier ces CGU à tout moment. Les modifications
                                            seront effectives dès leur publication sur la plateforme.
                                        </p>
                                    </section>
                                    <section>
                                        <h3 className="text-xl font-bold text-gray-900 mb-3">13. Droit Applicable</h3>
                                        <p>
                                            Les présentes CGU sont soumises au droit français. Tout litige sera soumis aux
                                            tribunaux compétents.
                                        </p>
                                    </section>
                                    <section>
                                        <h3 className="text-xl font-bold text-gray-900 mb-3">14. Contact</h3>
                                        <p>
                                            Pour toute question concernant ces CGU, vous pouvez nous contacter à :<br />
                                            Email : legal@dousha.com<br />
                                            Adresse : [Adresse de l'entreprise]
                                        </p>
                                    </section>
                                </div>
                            </div>
                        )}

                        {currentSection.id === 'privacy' && (
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                                    Politique de Confidentialité
                                </h2>
                                <div className="space-y-6 text-gray-700">
                                    <section>
                                        <h3 className="text-xl font-bold text-gray-900 mb-3">Introduction</h3>
                                        <p>
                                            Dousha s'engage à protéger la vie privée de ses utilisateurs. Cette politique explique
                                            comment nous collectons, utilisons et protégeons vos données personnelles.
                                        </p>
                                    </section>
                                    <section>
                                        <h3 className="text-xl font-bold text-gray-900 mb-3">Données Collectées</h3>
                                        <div className="space-y-2">
                                            <p><strong>Données d'inscription :</strong> Nom, email, mot de passe, numéro de téléphone</p>
                                            <p><strong>Données de profil :</strong> Photo, description, informations professionnelles</p>
                                            <p><strong>Données de paiement :</strong> Informations bancaires traitées via Stripe</p>
                                            <p><strong>Données d'utilisation :</strong> Historique des réservations, communications, préférences</p>
                                        </div>
                                    </section>
                                    <section>
                                        <h3 className="text-xl font-bold text-gray-900 mb-3">Utilisation des Données</h3>
                                        <p>
                                            Vos données sont utilisées pour : fournir nos services, améliorer l'expérience utilisateur,
                                            communiquer avec vous, assurer la sécurité et la conformité légale.
                                        </p>
                                    </section>
                                    <section>
                                        <h3 className="text-xl font-bold text-gray-900 mb-3">Partage des Données</h3>
                                        <p>
                                            Nous ne partageons vos données qu'avec : les prestataires concernés, nos partenaires
                                            de paiement (Stripe), les autorités légales si requis, et avec votre consentement explicite.
                                        </p>
                                    </section>
                                    <section>
                                        <h3 className="text-xl font-bold text-gray-900 mb-3">Sécurité</h3>
                                        <p>
                                            Nous utilisons des mesures de sécurité techniques et organisationnelles appropriées
                                            pour protéger vos données contre l'accès non autorisé, la modification, la divulgation
                                            ou la destruction.
                                        </p>
                                    </section>
                                    <section>
                                        <h3 className="text-xl font-bold text-gray-900 mb-3">Cookies</h3>
                                        <p>
                                            Nous utilisons des cookies pour améliorer votre expérience. Vous pouvez gérer
                                            vos préférences via notre Politique de Cookies.
                                        </p>
                                    </section>
                                    <section>
                                        <h3 className="text-xl font-bold text-gray-900 mb-3">Vos Droits</h3>
                                        <p>
                                            Conformément au RGPD, vous disposez du droit d'accès, de modification, de suppression
                                            et de portabilité de vos données personnelles.
                                        </p>
                                    </section>
                                    <section>
                                        <h3 className="text-xl font-bold text-gray-900 mb-3">Conservation</h3>
                                        <p>
                                            Vos données sont conservées uniquement pendant la durée nécessaire à l'accomplissement
                                            des finalités pour lesquelles elles ont été collectées.
                                        </p>
                                    </section>
                                    <section>
                                        <h3 className="text-xl font-bold text-gray-900 mb-3">Contact</h3>
                                        <p>
                                            Pour toute question sur cette politique : privacy@dousha.com
                                        </p>
                                    </section>
                                </div>
                            </div>
                        )}

                        {currentSection.id === 'cookies' && (
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                                    Politique de Cookies
                                </h2>
                                <div className="space-y-6 text-gray-700">
                                    <section>
                                        <h3 className="text-xl font-bold text-gray-900 mb-3">Qu'est-ce qu'un cookie ?</h3>
                                        <p>
                                            Un cookie est un petit fichier texte stocké sur votre appareil lorsque vous visitez
                                            notre site web. Il nous permet de vous reconnaître et d'améliorer votre expérience.
                                        </p>
                                    </section>
                                    <section>
                                        <h3 className="text-xl font-bold text-gray-900 mb-3">Types de cookies utilisés</h3>
                                        <div className="space-y-2">
                                            <p><strong>Cookies essentiels :</strong> Nécessaires au fonctionnement du site</p>
                                            <p><strong>Cookies de performance :</strong> Nous aident à améliorer le site</p>
                                            <p><strong>Cookies fonctionnels :</strong> Mémorisent vos préférences</p>
                                            <p><strong>Cookies de marketing :</strong> Pour des publicités personnalisées</p>
                                        </div>
                                    </section>
                                    <section>
                                        <h3 className="text-xl font-bold text-gray-900 mb-3">Gestion des cookies</h3>
                                        <p>
                                            Vous pouvez gérer vos préférences via les paramètres de votre navigateur ou notre
                                            panneau de configuration des cookies.
                                        </p>
                                    </section>
                                </div>
                            </div>
                        )}

                        {currentSection.id === 'cgv' && (
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                                    Conditions Générales de Vente
                                </h2>
                                <div className="space-y-6 text-gray-700">
                                    <section>
                                        <h3 className="text-xl font-bold text-gray-900 mb-3">Objet</h3>
                                        <p>
                                            Les CGV régissent les ventes de services proposés via la plateforme Dousha
                                            entre les prestataires et les clients.
                                        </p>
                                    </section>
                                    <section>
                                        <h3 className="text-xl font-bold text-gray-900 mb-3">Prix</h3>
                                        <p>
                                            Les prix sont indiqués en Qatari Riyals (QR) et incluent toutes taxes.
                                            Les prestataires s'engagent à maintenir leurs prix à jour.
                                        </p>
                                    </section>
                                    <section>
                                        <h3 className="text-xl font-bold text-gray-900 mb-3">Paiement</h3>
                                        <p>
                                            Les paiements sont sécurisés via Stripe. Un acompte peut être requis lors
                                            de la réservation. Le solde est payable selon les conditions convenues.
                                        </p>
                                    </section>
                                    <section>
                                        <h3 className="text-xl font-bold text-gray-900 mb-3">Annulation</h3>
                                        <p>
                                            Les conditions d'annulation varient selon le prestataire et le type de service.
                                            Consultez la politique d'annulation spécifique à chaque réservation.
                                        </p>
                                    </section>
                                    <section>
                                        <h3 className="text-xl font-bold text-gray-900 mb-3">Garanties</h3>
                                        <p>
                                            Les prestataires garantissent la qualité des services conformément à leur
                                            description. En cas de litige, Dousha peut intervenir comme médiateur.
                                        </p>
                                    </section>
                                </div>
                            </div>
                        )}

                        {currentSection.id === 'kyc' && (
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                                    Politique KYC (Know Your Customer)
                                </h2>
                                <div className="space-y-6 text-gray-700">
                                    <section>
                                        <h3 className="text-xl font-bold text-gray-900 mb-3">Objectif</h3>
                                        <p>
                                            Notre politique KYC vise à vérifier l'identité des prestataires pour assurer
                                            la sécurité et la confiance sur la plateforme.
                                        </p>
                                    </section>
                                    <section>
                                        <h3 className="text-xl font-bold text-gray-900 mb-3">Documents requis</h3>
                                        <div className="space-y-2">
                                            <p><strong>Pièce d'identité :</strong> Carte d'identité ou passeport valide</p>
                                            <p><strong>Licence professionnelle :</strong> Justificatif d'activité professionnelle</p>
                                            <p><strong>Attestation d'assurance :</strong> Couverture responsabilité civile</p>
                                            <p><strong>Portfolio :</strong> Exemples de réalisations</p>
                                        </div>
                                    </section>
                                    <section>
                                        <h3 className="text-xl font-bold text-gray-900 mb-3">Processus de vérification</h3>
                                        <p>
                                            Les documents sont examinés par notre équipe de modération sous 48-72h.
                                            En cas de doute, des informations complémentaires peuvent être demandées.
                                        </p>
                                    </section>
                                    <section>
                                        <h3 className="text-xl font-bold text-gray-900 mb-3">Confidentialité</h3>
                                        <p>
                                            Les documents KYC sont stockés de manière sécurisée et ne sont utilisés
                                            que pour la vérification d'identité et la conformité réglementaire.
                                        </p>
                                    </section>
                                </div>
                            </div>
                        )}

                        {currentSection.id === 'moderation' && (
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                                    Politique de Modération
                                </h2>
                                <div className="space-y-6 text-gray-700">
                                    <section>
                                        <h3 className="text-xl font-bold text-gray-900 mb-3">Principes</h3>
                                        <p>
                                            Notre politique de modération assure un environnement sûr et respectueux
                                            pour tous les utilisateurs de la plateforme.
                                        </p>
                                    </section>
                                    <section>
                                        <h3 className="text-xl font-bold text-gray-900 mb-3">Contenus interdits</h3>
                                        <div className="space-y-2">
                                            <p>• Contenus illégaux ou haineux</p>
                                            <p>• Harcèlement ou discrimination</p>
                                            <p>• Fausse information ou arnaque</p>
                                            <p>• Contenus sexuels explicites</p>
                                            <p>• Violation de propriété intellectuelle</p>
                                        </div>
                                    </section>
                                    <section>
                                        <h3 className="text-xl font-bold text-gray-900 mb-3">Processus de signalement</h3>
                                        <p>
                                            Tout utilisateur peut signaler un contenu inapproprié. Les signalements
                                            sont traités dans les 24h par notre équipe de modération.
                                        </p>
                                    </section>
                                    <section>
                                        <h3 className="text-xl font-bold text-gray-900 mb-3">Sanctions</h3>
                                        <div className="space-y-2">
                                            <p><strong>Avertissement :</strong> Pour première infraction mineure</p>
                                            <p><strong>Suspension :</strong> 7-30 jours selon la gravité</p>
                                            <p><strong>Bannissement :</strong> Pour infractions graves ou répétées</p>
                                        </div>
                                    </section>
                                    <section>
                                        <h3 className="text-xl font-bold text-gray-900 mb-3">Appel</h3>
                                        <p>
                                            Les utilisateurs peuvent faire appel d'une décision de modération
                                            en contactant notre support.
                                        </p>
                                    </section>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LegalPage;
