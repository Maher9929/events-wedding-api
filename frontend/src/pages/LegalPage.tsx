import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

type SectionId = 'terms' | 'privacy' | 'cookies' | 'cgv' | 'kyc' | 'moderation';

type LegalContent = {
  pageTitle: string;
  pageSubtitle: string;
  back: string;
  sections: Array<{
    id: SectionId;
    title: string;
    icon: string;
    blocks: Array<{
      heading: string;
      paragraphs: string[];
    }>;
  }>;
};

const legalContentByLang: Record<'fr' | 'en' | 'ar', LegalContent> = {
  fr: {
    pageTitle: 'Mentions légales',
    pageSubtitle: 'Consultez les règles, politiques et engagements de la plateforme.',
    back: 'Retour',
    sections: [
      {
        id: 'terms',
        title: "Conditions générales d'utilisation",
        icon: 'fa-file-contract',
        blocks: [
          {
            heading: 'Objet',
            paragraphs: [
              "La plateforme Dousha met en relation des clients et des prestataires pour l'organisation d'événements.",
              "L'utilisation du site implique l'acceptation des présentes conditions."
            ]
          },
          {
            heading: 'Comptes et accès',
            paragraphs: [
              "L'utilisateur s'engage à fournir des informations exactes lors de l'inscription.",
              "Chaque utilisateur est responsable de la confidentialité de son compte et de ses identifiants."
            ]
          },
          {
            heading: 'Responsabilités',
            paragraphs: [
              "Les prestataires restent responsables de la qualité, du prix et de l'exécution de leurs services.",
              "Dousha agit comme intermédiaire technologique et peut modérer les contenus ou suspendre des comptes en cas d'abus."
            ]
          }
        ]
      },
      {
        id: 'privacy',
        title: 'Politique de confidentialité',
        icon: 'fa-shield-alt',
        blocks: [
          {
            heading: 'Données collectées',
            paragraphs: [
              'Nous pouvons collecter des données de compte, de profil, de réservation, de paiement et de communication.',
              "Certaines données sont nécessaires au fonctionnement du service et à la sécurité de la plateforme."
            ]
          },
          {
            heading: 'Utilisation des données',
            paragraphs: [
              "Les données sont utilisées pour fournir le service, améliorer l'expérience utilisateur, prévenir la fraude et assurer la conformité légale.",
              "Les paiements sont traités par des prestataires spécialisés comme Stripe."
            ]
          },
          {
            heading: 'Droits des utilisateurs',
            paragraphs: [
              "L'utilisateur peut demander l'accès, la rectification ou la suppression de ses données selon la réglementation applicable.",
              'Les demandes liées à la confidentialité peuvent être traitées par le support de la plateforme.'
            ]
          }
        ]
      },
      {
        id: 'cookies',
        title: 'Politique de cookies',
        icon: 'fa-cookie',
        blocks: [
          {
            heading: 'Usage',
            paragraphs: [
              "Des cookies peuvent être utilisés pour mémoriser la langue, maintenir la session et mesurer l'usage du site.",
              "Le refus de certains cookies peut limiter certaines fonctionnalités."
            ]
          },
          {
            heading: 'Contrôle',
            paragraphs: [
              "L'utilisateur peut gérer ses préférences via son navigateur ou les paramètres proposés par la plateforme."
            ]
          }
        ]
      },
      {
        id: 'cgv',
        title: 'Conditions générales de vente',
        icon: 'fa-handshake',
        blocks: [
          {
            heading: 'Réservations et paiements',
            paragraphs: [
              "Les prix affichés sont fixés par les prestataires. Certains services peuvent nécessiter un acompte.",
              "Le solde, les remboursements et les délais d'annulation dépendent des règles applicables à la réservation."
            ]
          },
          {
            heading: 'Litiges',
            paragraphs: [
              "En cas de litige, la plateforme peut faciliter les échanges entre les parties sans se substituer à leurs obligations contractuelles."
            ]
          }
        ]
      },
      {
        id: 'kyc',
        title: 'Politique KYC',
        icon: 'fa-user-check',
        blocks: [
          {
            heading: 'Vérification',
            paragraphs: [
              "Les prestataires peuvent être invités à fournir des documents d'identité, de société ou d'activité pour renforcer la confiance sur la marketplace.",
              "Les documents transmis sont examinés de manière sécurisée par l'équipe d'administration."
            ]
          }
        ]
      },
      {
        id: 'moderation',
        title: 'Politique de modération',
        icon: 'fa-gavel',
        blocks: [
          {
            heading: 'Contenus interdits',
            paragraphs: [
              'Les contenus frauduleux, haineux, trompeurs, illégaux ou portant atteinte aux droits de tiers sont interdits.',
              'Les faux avis, spams et abus répétés peuvent entraîner une suspension ou un bannissement.'
            ]
          },
          {
            heading: 'Signalement',
            paragraphs: [
              "Les utilisateurs peuvent signaler un contenu ou un comportement. L'équipe de modération peut enquêter, supprimer du contenu ou appliquer des sanctions."
            ]
          }
        ]
      }
    ]
  },
  en: {
    pageTitle: 'Legal information',
    pageSubtitle: 'Review the platform rules, policies, and commitments.',
    back: 'Back',
    sections: [
      {
        id: 'terms',
        title: 'Terms of use',
        icon: 'fa-file-contract',
        blocks: [
          {
            heading: 'Purpose',
            paragraphs: [
              'Dousha connects clients and service providers for event planning and booking.',
              'Using the platform means you accept these terms.'
            ]
          },
          {
            heading: 'Accounts and access',
            paragraphs: [
              'Users must provide accurate information when creating an account.',
              'Each user is responsible for keeping account credentials secure.'
            ]
          },
          {
            heading: 'Responsibilities',
            paragraphs: [
              'Providers remain responsible for the quality, pricing, and delivery of their services.',
              'Dousha acts as a technology intermediary and may moderate content or suspend abusive accounts.'
            ]
          }
        ]
      },
      {
        id: 'privacy',
        title: 'Privacy policy',
        icon: 'fa-shield-alt',
        blocks: [
          {
            heading: 'Collected data',
            paragraphs: [
              'We may collect account, profile, booking, payment, and communication data.',
              'Some data is required for platform functionality and security.'
            ]
          },
          {
            heading: 'Use of data',
            paragraphs: [
              'Data is used to provide the service, improve the experience, prevent fraud, and meet legal obligations.',
              'Payments may be processed through specialized providers such as Stripe.'
            ]
          },
          {
            heading: 'User rights',
            paragraphs: [
              'Users may request access, correction, or deletion of personal data where applicable.',
              'Privacy-related requests can be handled by platform support.'
            ]
          }
        ]
      },
      {
        id: 'cookies',
        title: 'Cookie policy',
        icon: 'fa-cookie',
        blocks: [
          {
            heading: 'Usage',
            paragraphs: [
              'Cookies may be used to remember language, maintain the session, and measure site usage.',
              'Rejecting some cookies may limit certain features.'
            ]
          },
          {
            heading: 'Control',
            paragraphs: [
              'Users can manage preferences through browser settings or platform controls.'
            ]
          }
        ]
      },
      {
        id: 'cgv',
        title: 'Terms of sale',
        icon: 'fa-handshake',
        blocks: [
          {
            heading: 'Bookings and payments',
            paragraphs: [
              'Displayed prices are set by providers. Some bookings may require a deposit.',
              'Final payment, refunds, and cancellation deadlines depend on the booking rules in effect.'
            ]
          },
          {
            heading: 'Disputes',
            paragraphs: [
              'In case of dispute, the platform may help facilitate communication without replacing the parties contractual obligations.'
            ]
          }
        ]
      },
      {
        id: 'kyc',
        title: 'KYC policy',
        icon: 'fa-user-check',
        blocks: [
          {
            heading: 'Verification',
            paragraphs: [
              'Providers may be asked to submit identity or business documents to increase trust on the marketplace.',
              'Submitted documents are reviewed securely by the administration team.'
            ]
          }
        ]
      },
      {
        id: 'moderation',
        title: 'Moderation policy',
        icon: 'fa-gavel',
        blocks: [
          {
            heading: 'Prohibited content',
            paragraphs: [
              'Fraudulent, hateful, misleading, illegal, or rights-infringing content is prohibited.',
              'Fake reviews, spam, and repeated abuse may lead to suspension or permanent bans.'
            ]
          },
          {
            heading: 'Reporting',
            paragraphs: [
              'Users may report content or behavior. The moderation team may investigate, remove content, or apply sanctions.'
            ]
          }
        ]
      }
    ]
  },
  ar: {
    pageTitle: 'المعلومات القانونية',
    pageSubtitle: 'اطلع على السياسات والقواعد والالتزامات الخاصة بالمنصة.',
    back: 'رجوع',
    sections: [
      {
        id: 'terms',
        title: 'شروط الاستخدام',
        icon: 'fa-file-contract',
        blocks: [
          {
            heading: 'الغرض',
            paragraphs: [
              'تربط منصة Dousha بين العملاء ومقدمي الخدمات لتنظيم المناسبات والحجوزات.',
              'استخدام المنصة يعني الموافقة على هذه الشروط.'
            ]
          },
          {
            heading: 'الحسابات والدخول',
            paragraphs: [
              'يجب على المستخدم تقديم معلومات صحيحة عند إنشاء الحساب.',
              'كل مستخدم مسؤول عن حماية بيانات الدخول الخاصة به.'
            ]
          },
          {
            heading: 'المسؤوليات',
            paragraphs: [
              'يبقى مقدم الخدمة مسؤولاً عن الجودة والسعر والتنفيذ الخاص بخدماته.',
              'تعمل Dousha كوسيط تقني ويمكنها الإشراف على المحتوى أو تعليق الحسابات المسيئة.'
            ]
          }
        ]
      },
      {
        id: 'privacy',
        title: 'سياسة الخصوصية',
        icon: 'fa-shield-alt',
        blocks: [
          {
            heading: 'البيانات التي نجمعها',
            paragraphs: [
              'قد نقوم بجمع بيانات الحساب والملف الشخصي والحجز والدفع والمراسلات.',
              'بعض البيانات ضرورية لتشغيل المنصة وضمان الأمان.'
            ]
          },
          {
            heading: 'استخدام البيانات',
            paragraphs: [
              'تستخدم البيانات لتقديم الخدمة وتحسين التجربة ومنع الاحتيال والامتثال القانوني.',
              'قد تتم معالجة المدفوعات عبر مزودين متخصصين مثل Stripe.'
            ]
          },
          {
            heading: 'حقوق المستخدم',
            paragraphs: [
              'يمكن للمستخدم طلب الوصول إلى بياناته أو تعديلها أو حذفها وفق الأنظمة المعمول بها.',
              'يمكن معالجة طلبات الخصوصية عبر دعم المنصة.'
            ]
          }
        ]
      },
      {
        id: 'cookies',
        title: 'سياسة ملفات الارتباط',
        icon: 'fa-cookie',
        blocks: [
          {
            heading: 'الاستخدام',
            paragraphs: [
              'قد تستخدم ملفات الارتباط لتذكر اللغة والحفاظ على الجلسة وقياس استخدام الموقع.',
              'رفض بعض الملفات قد يحد من بعض الوظائف.'
            ]
          },
          {
            heading: 'التحكم',
            paragraphs: [
              'يمكن للمستخدم إدارة التفضيلات من خلال إعدادات المتصفح أو أدوات المنصة.'
            ]
          }
        ]
      },
      {
        id: 'cgv',
        title: 'شروط البيع',
        icon: 'fa-handshake',
        blocks: [
          {
            heading: 'الحجوزات والمدفوعات',
            paragraphs: [
              'الأسعار المعروضة يحددها مقدمو الخدمات، وقد تتطلب بعض الحجوزات دفعة مقدمة.',
              'يعتمد الرصيد النهائي والاسترداد ومواعيد الإلغاء على سياسة الحجز المعتمدة.'
            ]
          },
          {
            heading: 'النزاعات',
            paragraphs: [
              'عند حدوث نزاع يمكن للمنصة تسهيل التواصل بين الأطراف دون أن تحل محل التزاماتهم التعاقدية.'
            ]
          }
        ]
      },
      {
        id: 'kyc',
        title: 'سياسة التحقق KYC',
        icon: 'fa-user-check',
        blocks: [
          {
            heading: 'التحقق',
            paragraphs: [
              'قد يُطلب من مقدمي الخدمات رفع مستندات هوية أو نشاط تجاري لتعزيز الثقة داخل المنصة.',
              'تتم مراجعة المستندات بشكل آمن من قبل فريق الإدارة.'
            ]
          }
        ]
      },
      {
        id: 'moderation',
        title: 'سياسة الإشراف',
        icon: 'fa-gavel',
        blocks: [
          {
            heading: 'المحتوى المحظور',
            paragraphs: [
              'يُحظر المحتوى الاحتيالي أو المسيء أو المضلل أو غير القانوني أو المخالف لحقوق الآخرين.',
              'قد تؤدي المراجعات المزيفة أو الرسائل المزعجة أو الإساءة المتكررة إلى تعليق الحساب أو حظره.'
            ]
          },
          {
            heading: 'الإبلاغ',
            paragraphs: [
              'يمكن للمستخدمين الإبلاغ عن محتوى أو سلوك غير مناسب، ويحق لفريق الإشراف التحقيق واتخاذ الإجراءات اللازمة.'
            ]
          }
        ]
      }
    ]
  }
};

const LegalPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { i18n } = useTranslation();

  const section = (searchParams.get('section') || 'terms') as SectionId;
  const language = (i18n.language?.split('-')[0] || 'fr') as 'fr' | 'en' | 'ar';
  const content = legalContentByLang[language] || legalContentByLang.fr;

  const currentSection = useMemo(
    () => content.sections.find((item) => item.id === section) || content.sections[0],
    [content.sections, section]
  );

  return (
    <div className="min-h-screen bg-bglight" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-6xl mx-auto p-5">
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-primary font-bold mb-4"
          >
            <i className={`fa-solid ${language === 'ar' ? 'fa-arrow-right' : 'fa-arrow-left'}`}></i>
            {content.back}
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{content.pageTitle}</h1>
          <p className="text-gray-600">{content.pageSubtitle}</p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {content.sections.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(`/legal?section=${item.id}`)}
                className={`p-4 rounded-xl text-left transition-all ${
                  currentSection.id === item.id
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <i className={`fa-solid ${item.icon} text-lg`}></i>
                  <span className="font-bold">{item.title}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm p-8">
          <div className="space-y-8">
            <h2 className="text-2xl font-bold text-gray-900">{currentSection.title}</h2>

            {currentSection.blocks.map((block) => (
              <section key={block.heading} className="space-y-3 text-gray-700">
                <h3 className="text-xl font-bold text-gray-900">{block.heading}</h3>
                {block.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="leading-8">
                    {paragraph}
                  </p>
                ))}
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LegalPage;
