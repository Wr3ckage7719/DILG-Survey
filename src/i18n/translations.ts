/* Bilingual (Tagalog/English) UI dictionary.
 * Keys are flat strings; values are the visible labels.
 * `tl` is the canonical dictionary, `en` must cover every key (enforced by TS).
 */

import type { Language } from '../types';

const tl = {
  // Language picker
  'picker.heading': 'Pumili ng Wika',
  'picker.subtitle': 'Piliin ang wika na inyong gagamitin sa sarbey.',
  'picker.filipino': 'Filipino (Tagalog)',
  'picker.filipinoDesc': 'Wikang pambansa',
  'picker.english': 'English',
  'picker.englishDesc': 'Ang wikang Ingles',
  'picker.continue': 'Magpatuloy',
  'picker.back': 'Bumalik',

  // Shared
  'common.placeholder': '— Pumili —',

  // Bottom navigation
  'nav.back': 'Bumalik',
  'nav.next': 'Susunod',
  'nav.submit': 'Isumite ang Sarbey',
  'nav.submitting': 'Ipinapadala\u2026',

  // Toasts & validation
  'toast.submitted': 'Naipadala ang inyong sarbey!',
  'toast.failed': 'Hindi nakapag-submit. Pakisubukan muli.',
  'validation.email': 'Hindi valid ang email address.',
  'validation.phone': 'Hindi valid ang contact number.',
  'error.rateLimit': 'Masyadong mabilis. Pakihintay ng {seconds} segundo.',

  // Thank-you screen
  'done.title': 'Maraming Salamat!',
  'done.message': 'Ang inyong tugon ay makatutulong sa pagpapabuti ng serbisyo publiko.',
  'done.refLabel': 'Reference Number',
  'done.refHint': 'Pakitago ang numerong ito para sa inyong talaan.',

  // Step indicator
  'indicator.office': 'Tanggapan',
  'indicator.demo': 'Demo',
  'indicator.cc': 'CC',
  'indicator.quality': 'Kalidad',
  'indicator.feedback': 'Pun\u00e1',

  // Office step
  'office.name': 'Pangalan ng tanggapan / operating unit',
  'office.selectOffice': 'Pumili ng tanggapan',
  'office.service': 'Serbisyong ibinigay',
  'office.selectService': 'Pumili ng serbisyo',
  'office.other': 'Tukuyin ang iba pang serbisyo:',
  'office.otherPlaceholder': 'Ilagay ang serbisyo...',

  // Demographics step
  'demo.clientType': 'Uri ng Kliyente',
  'demo.clientTypeErr': 'Pumili ng uri ng kliyente',
  'demo.age': 'Edad',
  'demo.ageErr': 'Pumili ng edad',
  'demo.sex': 'Kasarian',
  'demo.sexErr': 'Pumili ng kasarian',
  'demo.region': 'Rehiyon ng tirahan',
  'demo.regionErr': 'Pumili ng rehiyon',

  // CC section
  'cc.bannerTitle': 'Gabay ng Mamamayan ng DILG',
  'cc.bannerText':
    'Panuto: Ang Gabay ng Mamamayan ay isang dokumento na nagpapakita ng mga serbisyo ' +
    'ng isang tanggapan ng pamahalaan at mga kaakibat nitong kahilingan, babayaran, at ' +
    'tagal ng pagpoproseso.',
  'cc.title1': 'CC1. Alin sa mga sumusunod ang naglalarawan ng iyong kaalaman sa CC/Gabay?',
  'cc.title2': 'CC2. Kung alam ang Gabay, masasabi mo ba na ang Gabay ng tanggapang ito ay:',
  'cc.title3': 'CC3. Kung alam ang Gabay, gaano nakatulong ang Gabay sa iyong transaksiyon?',
  'cc.select': 'Pumili ng sagot',

  // SQD section
  'sqd.instructions': 'Panuto',
  'sqd.instructionsText': 'Lagyan ng tsek (\u2713) ang hanay na pinakaangkop sa iyong sagot.',

  // Feedback section
  'feedback.suggestions': 'Mga mungkahi',
  'feedback.suggestionsPrompt': 'Paano pa mapapabuti ang aming serbisyo?',
  'feedback.suggestionsPlaceholder': 'Isulat ang inyong mungkahi...',
  'feedback.clientInfo': 'Impormasyon ng Kliyente',
  'feedback.clientInfoHint': 'Hindi required. Punan lamang kung nais mong makontak ka namin.',
  'feedback.nameLabel': 'Pangalan (optional)',
  'feedback.namePlaceholder': 'Pangalan',
  'feedback.contactLabel': 'Contact number',
  'feedback.contactPlaceholder': '0917 123 4567',
  'feedback.emailLabel': 'Email address',
  'feedback.emailPlaceholder': 'email@example.com',
} as const;

export type TranslationKey = keyof typeof tl;

const en: Record<TranslationKey, string> = {
  // Language picker
  'picker.heading': 'Choose a Language',
  'picker.subtitle': 'Select the language you will use for the survey.',
  'picker.filipino': 'Filipino (Tagalog)',
  'picker.filipinoDesc': 'National language',
  'picker.english': 'English',
  'picker.englishDesc': 'The English language',
  'picker.continue': 'Continue',
  'picker.back': 'Back',

  // Shared
  'common.placeholder': '— Select —',

  // Bottom navigation
  'nav.back': 'Back',
  'nav.next': 'Next',
  'nav.submit': 'Submit Survey',
  'nav.submitting': 'Submitting\u2026',

  // Toasts & validation
  'toast.submitted': 'Your survey has been submitted!',
  'toast.failed': 'Unable to submit. Please try again.',
  'validation.email': 'Invalid email address.',
  'validation.phone': 'Invalid contact number.',
  'error.rateLimit': 'Too fast. Please wait {seconds} seconds.',

  // Thank-you screen
  'done.title': 'Thank you!',
  'done.message': 'Your response will help improve public service.',
  'done.refLabel': 'Reference Number',
  'done.refHint': 'Please keep this number for your records.',

  // Step indicator
  'indicator.office': 'Office',
  'indicator.demo': 'Demo',
  'indicator.cc': 'CC',
  'indicator.quality': 'Quality',
  'indicator.feedback': 'Feedback',

  // Office step
  'office.name': 'Name of office / operating unit',
  'office.selectOffice': 'Select an office',
  'office.service': 'Service availed',
  'office.selectService': 'Select a service',
  'office.other': 'Specify other service:',
  'office.otherPlaceholder': 'Enter the service...',

  // Demographics step
  'demo.clientType': 'Type of Client',
  'demo.clientTypeErr': 'Select a type of client',
  'demo.age': 'Age',
  'demo.ageErr': 'Select your age',
  'demo.sex': 'Sex',
  'demo.sexErr': 'Select your sex',
  'demo.region': 'Region of residence',
  'demo.regionErr': 'Select a region',

  // CC section
  'cc.bannerTitle': 'DILG Citizen\u2019s Charter',
  'cc.bannerText':
    'Instructions: The Citizen\u2019s Charter is a document that shows the services ' +
    'of a government office and its corresponding requirements, fees, and processing time.',
  'cc.title1': 'CC1. Which of the following best describes your awareness of the CC/Charter?',
  'cc.title2': 'CC2. If aware of the Charter, would you say that this office\u2019s Charter is:',
  'cc.title3': 'CC3. If aware of the Charter, how helpful was the Charter in your transaction?',
  'cc.select': 'Select an answer',

  // SQD section
  'sqd.instructions': 'Instructions',
  'sqd.instructionsText': 'Check (\u2713) the column that best fits your answer.',

  // Feedback section
  'feedback.suggestions': 'Suggestions',
  'feedback.suggestionsPrompt': 'How can we further improve our service?',
  'feedback.suggestionsPlaceholder': 'Write your suggestion...',
  'feedback.clientInfo': 'Client Information',
  'feedback.clientInfoHint': 'Not required. Fill in only if you wish to be contacted.',
  'feedback.nameLabel': 'Name (optional)',
  'feedback.namePlaceholder': 'Name',
  'feedback.contactLabel': 'Contact number',
  'feedback.contactPlaceholder': '0917 123 4567',
  'feedback.emailLabel': 'Email address',
  'feedback.emailPlaceholder': 'email@example.com',
};

export const translations: Record<Language, Record<TranslationKey, string>> = { tl, en };
