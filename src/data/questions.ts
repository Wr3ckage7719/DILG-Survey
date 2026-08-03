import type { Language } from '../types';

export const DISCLAIMER = {
  title: 'Dear Client,',
  text: 'Kindly fill-up this survey form and let us know your experience while transacting ' +
    'official business with us. We collect your personal data in this form for statistical ' +
    'and evaluation purposes. Your information will be stored in our database or secured ' +
    'records locker for physical forms for two years before being permanently erased from ' +
    'our records. Should you need to update your personal data, you may contact the ' +
    'designated action officer. If you wish to report any unlawful processing of data from ' +
    'this survey, please contact the DILG Data Protection Officer at dpo.dilg@gmail.com.',
  boldPhrases: [
    'We collect your personal data in this form for statistical and evaluation purposes.',
    'Your information will be stored in our database or secured records locker for physical forms for two years before being permanently erased from our records',
    'you may contact the designated action officer',
    'please contact the DILG Data Protection Officer at dpo.dilg@gmail.com',
  ],
};

/* ─── Bilingual option lists ───
 * Each pair shares the same index order, so an item can be mapped between
 * languages by position. Forms ALWAYS store the canonical Tagalog string;
 * English mode only localizes the display. */

type BilingualList = Record<Language, string[]>;
type BilingualGroupList = Record<Language, { label: string; items: string[] }[]>;

/** Given a localized value, return the canonical (Tagalog) value. */
export function canonicalOf(list: BilingualList, lang: Language, value: string): string {
  const idx = list[lang].indexOf(value);
  return idx === -1 ? value : list.tl[idx];
}

/** Given a canonical (Tagalog) value, return the localized display value. */
export function localizedOf(list: BilingualList, lang: Language, value: string): string {
  const idx = list.tl.indexOf(value);
  return idx === -1 ? value : list[lang][idx];
}

export const OFFICES = [
  'DILG Camarines Norte (Records)',
  'Local Government Monitoring and Evaluation Section (LGMES)',
  'Local Government Capability and Development Section (LGCDS)',
  'Project Development and Monitoring Unit (PDMU)',
  'Finance and Administrative Section (FAS)',
];

export const SERVICES: BilingualList = {
  tl: [
    'Pagtanggap ng mga papasok na komunikasyon at dokumento (Receiving of Letters, Communications, and Other Official Documents)',
    'Pagtanggap at pagruruta ng mga sulat, memorandum, at iba pang opisyal na dokumento',
    'Pagbibigay ng impormasyon at public assistance',
    'Pagtanggap at pagproseso ng mga kahilingan at dokumento',
    'Pagbibigay ng technical assistance at capacity development',
    'Pagsasagawa ng monitoring at evaluation ng mga programa at proyekto',
    'Pagbibigay ng orientation, seminar, at training',
    'Pagproseso ng mga reklamo at feedback ng mamamayan',
    'Pagpapalabas ng mga sertipikasyon, endorsements, at rekomendasyon',
    'Pagbibigay ng legal at policy advisory services',
    'Pangangasiwa at koordinasyon ng mga programa ng pamahalaan',
    'Pagsasagawa ng inspeksyon at validation',
    'Pangongolekta at pamamahala ng datos at ulat',
    'Pagbibigay ng online services at digital platforms',
    'Other/s (Tukuyin ang iba pang serbisyo)',
  ],
  en: [
    'Receiving of incoming communications and documents (Letters, Communications, and Other Official Documents)',
    'Receiving and routing of letters, memoranda, and other official documents',
    'Providing information and public assistance',
    'Receiving and processing of requests and documents',
    'Providing technical assistance and capacity development',
    'Conducting monitoring and evaluation of programs and projects',
    'Providing orientation, seminars, and training',
    'Processing of citizen complaints and feedback',
    'Issuance of certifications, endorsements, and recommendations',
    'Providing legal and policy advisory services',
    'Managing and coordinating government programs',
    'Conducting inspections and validation',
    'Collecting and managing data and reports',
    'Providing online services and digital platforms',
    'Other/s (Specify other service)',
  ],
};

export const SERVICE_GROUPS: BilingualGroupList = {
  tl: [
    {
      label: 'Dokumento',
      items: [
        'Pagtanggap ng mga papasok na komunikasyon at dokumento (Receiving of Letters, Communications, and Other Official Documents)',
        'Pagtanggap at pagruruta ng mga sulat, memorandum, at iba pang opisyal na dokumento',
      ],
    },
    {
      label: 'Serbisyong Teknikal',
      items: [
        'Pagbibigay ng technical assistance at capacity development',
        'Pagsasagawa ng monitoring at evaluation ng mga programa at proyekto',
        'Pagbibigay ng orientation, seminar, at training',
      ],
    },
    {
      label: 'Serbisyong Pampubliko',
      items: [
        'Pagbibigay ng impormasyon at public assistance',
        'Pagtanggap at pagproseso ng mga kahilingan at dokumento',
        'Pagpapalabas ng mga sertipikasyon, endorsements, at rekomendasyon',
      ],
    },
    {
      label: 'Legal, Reklamo, at Koordinasyon',
      items: [
        'Pagproseso ng mga reklamo at feedback ng mamamayan',
        'Pagbibigay ng legal at policy advisory services',
        'Pangangasiwa at koordinasyon ng mga programa ng pamahalaan',
        'Pagsasagawa ng inspeksyon at validation',
      ],
    },
    {
      label: 'Iba pang Serbisyo',
      items: [
        'Pangongolekta at pamamahala ng datos at ulat',
        'Pagbibigay ng online services at digital platforms',
        'Other/s (Tukuyin ang iba pang serbisyo)',
      ],
    },
  ],
  en: [
    {
      label: 'Documents',
      items: [
        'Receiving of incoming communications and documents (Letters, Communications, and Other Official Documents)',
        'Receiving and routing of letters, memoranda, and other official documents',
      ],
    },
    {
      label: 'Technical Services',
      items: [
        'Providing technical assistance and capacity development',
        'Conducting monitoring and evaluation of programs and projects',
        'Providing orientation, seminars, and training',
      ],
    },
    {
      label: 'Public Services',
      items: [
        'Providing information and public assistance',
        'Receiving and processing of requests and documents',
        'Issuance of certifications, endorsements, and recommendations',
      ],
    },
    {
      label: 'Legal, Complaints, and Coordination',
      items: [
        'Processing of citizen complaints and feedback',
        'Providing legal and policy advisory services',
        'Managing and coordinating government programs',
        'Conducting inspections and validation',
      ],
    },
    {
      label: 'Other Services',
      items: [
        'Collecting and managing data and reports',
        'Providing online services and digital platforms',
        'Other/s (Specify other service)',
      ],
    },
  ],
};

export const KLIYENTE: BilingualList = {
  tl: ['Mamamayan', 'Negosyo', 'Gobyerno (empleyado o mula sa ibang ahensiya)'],
  en: ['Citizen', 'Business', 'Government (employee or from another agency)'],
};

export const EDAD: BilingualList = {
  tl: [
    'Mas mababa sa 18 y/o',
    '18-24 y/o',
    '25-34 y/o',
    '35-44 y/o',
    '45-54 y/o',
    '55-64 y/o',
    '65 y/o pataas',
  ],
  en: [
    'Below 18 y/o',
    '18-24 y/o',
    '25-34 y/o',
    '35-44 y/o',
    '45-54 y/o',
    '55-64 y/o',
    '65 y/o and above',
  ],
};

export const KASARIAN: BilingualList = {
  tl: ['Lalaki', 'Babae', 'LGBTQIA+', 'Hindi nais sabihin'],
  en: ['Man', 'Woman', 'LGBTQIA+', 'Prefer not to say'],
};

export const REGIONS = [
  'National Capital Region (NCR) – Metro Manila',
  'Cordillera Administrative Region (CAR)',
  'Region I – Ilocos Region',
  'Region II – Cagayan Valley',
  'Region III – Central Luzon',
  'Region IV-A – CALABARZON',
  'Region IV-B – MIMAROPA',
  'Region V – Bicol Region',
  'Region VI – Western Visayas',
  'Region VII – Central Visayas',
  'Region VIII – Eastern Visayas',
  'Region IX – Zamboanga Peninsula',
  'Region X – Northern Mindanao',
  'Region XI – Davao Region',
  'Region XII – SOCCSKSARGEN',
  'Region XIII – Caraga',
  'Bangsamoro Autonomous Region in Muslim Mindanao (BARMM)',
];

export const REGION_GROUPS = [
  {
    label: 'Luzon',
    items: [
      'National Capital Region (NCR) – Metro Manila',
      'Cordillera Administrative Region (CAR)',
      'Region I – Ilocos Region',
      'Region II – Cagayan Valley',
      'Region III – Central Luzon',
      'Region IV-A – CALABARZON',
      'Region IV-B – MIMAROPA',
      'Region V – Bicol Region',
    ],
  },
  {
    label: 'Visayas',
    items: [
      'Region VI – Western Visayas',
      'Region VII – Central Visayas',
      'Region VIII – Eastern Visayas',
    ],
  },
  {
    label: 'Mindanao',
    items: [
      'Region IX – Zamboanga Peninsula',
      'Region X – Northern Mindanao',
      'Region XI – Davao Region',
      'Region XII – SOCCSKSARGEN',
      'Region XIII – Caraga',
      'Bangsamoro Autonomous Region in Muslim Mindanao (BARMM)',
    ],
  },
];

export const CC1_OPTIONS: BilingualList = {
  tl: [
    'Alam ko kung ano ang Gabay, at nakita ko ang Gabay ng tanggapang ito.',
    'Alam ko kung ano ang Gabay, ngunit hindi ko nakita ang Gabay ng tanggapang ito.',
    'Nalaman ko kung ano ang Gabay noong nakita ko ang Gabay ng tanggapang ito.',
    'Hindi ko alam kung ano ang Gabay, at hindi ako nakakita ng Gabay sa tanggapang ito. (Piliin ang N/A sa CC2 at CC3.)',
  ],
  en: [
    'I know what a CC is and I saw this office\u2019s CC.',
    'I know what a CC is but I did NOT see this office\u2019s CC.',
    'I learned of the CC only when I saw this office\u2019s CC.',
    'I do not know what a CC is and I did not see one in this office. (Answer \u2018N/A\u2019 on CC2 and CC3)',
  ],
};

export const CC2_OPTIONS: BilingualList = {
  tl: ['Madaling makita', 'Bahagyang nakikita', 'Mahirap makita', 'Hindi makita', 'N/A'],
  en: ['Easy to see', 'Somewhat easy to see', 'Difficult to see', 'Not visible at all', 'N/A'],
};

export const CC3_OPTIONS: BilingualList = {
  tl: ['Lubos na nakatulong', 'Bahagyang nakatulong', 'Hindi nakatulong', 'N/A'],
  en: ['Helped very much', 'Somewhat helped', 'Did not help', 'N/A'],
};

export const SQD_OPTIONS: BilingualList = {
  tl: [
    'Lubos na sang-ayon',
    'Sang-ayon',
    'Walang kinikilingan',
    'Hindi sang-ayon',
    'Lubos na hindi sang-ayon',
    'N/A',
  ],
  en: [
    'Strongly agree',
    'Agree',
    'Neither agree nor disagree',
    'Disagree',
    'Strongly disagree',
    'N/A',
  ],
};

export const SQD_LABELS: BilingualList = {
  tl: [
    'SQD0. Nasiyahan ako sa serbisyo na aking hiniling.',
    'SQD1. Makatuwiran ang oras na aking inilaan para sa transaksiyon.',
    'SQD2. Sinunod ng tanggapan ang mga kahilingan at hakbang batay sa impormasyong ibinigay.',
    'SQD3. Ang mga hakbang sa pagproseso, kasama na ang pagbayad ay madali at simple lamang.',
    'SQD4. Madali kong nahanap ang impormasyon tungkol sa aking transaksiyon mula sa tanggapan o kanilang website.',
    'SQD5. Nagbayad ako ng makatuwirang halaga para sa aking transaksyon. (Kung ang serbisyo ay libre, piliin ang N/A)',
    'SQD6. Pakiramdam ko ay patas sa lahat o walang palakasan sa tanggapan para sa aking transaksiyon.',
    'SQD7. Matulungin at magalang ang pakikitungo sa akin ng mga kawani.',
    'SQD8. Nakuha ko ang kinakailangan ko mula sa tanggapan. (Kung tinanggihan man, sapat na ipinaliwanag.)',
  ],
  en: [
    'SQD0. I am satisfied with the service that I availed.',
    'SQD1. I spent a reasonable amount of time for my transaction.',
    'SQD2. The office followed the transaction\u2019s requirements and steps based on the information provided.',
    'SQD3. The steps (including payment) I needed to do for my transaction were easy and simple.',
    'SQD4. I easily found information about my transaction from the office or its website.',
    'SQD5. I paid a reasonable amount of fees for my transaction. (If service was free, mark the \u2018N/A\u2019 column.)',
    'SQD6. I feel the office was fair to everyone, or \u201cwalang palakasan\u201d, during my transaction.',
    'SQD7. I was treated courteously by the staff, and (if asked for help) the staff was helpful.',
    'SQD8. I got what I needed from the government office, or (if denied) denial of request was sufficiently explained to me.',
  ],
};
