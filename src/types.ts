export interface FormData {
  pangalanNgTanggapan: string;
  serbisyongIbinigay: string;
  serbisyongIba: string;
  uriNgKliyente: string;
  edad: string;
  kasarian: string;
  rehiyon: string;
  cc1: string;
  cc2: string;
  cc3: string;
  sqd: string[]; // 9 items: SQD0–SQD8
  mgaMungkahi: string;
  pangalan: string;
  contactNumber: string;
  emailAddress: string;
}

export type SectionId = 'office' | 'demographics' | 'cc' | 'sqd' | 'feedback' | 'review';

export const SECTIONS: SectionId[] = ['office', 'demographics', 'cc', 'sqd', 'feedback', 'review'];

export const SECTION_LABELS: Record<SectionId, string> = {
  office: '1. Detalye ng Tanggapan',
  demographics: '2. Demograpiko',
  cc: '3. Gabay ng Mamamayan',
  sqd: '4. Kalidad ng Serbisyo',
  feedback: '5. Puná at Impormasyon',
  review: '6. Kumpirmahin ang Sarbey',
};

export const INITIAL_FORM: FormData = {
  pangalanNgTanggapan: '',
  serbisyongIbinigay: '',
  serbisyongIba: '',
  uriNgKliyente: '',
  edad: '',
  kasarian: '',
  rehiyon: '',
  cc1: '',
  cc2: '',
  cc3: '',
  sqd: ['', '', '', '', '', 'N/A', '', '', ''],
  mgaMungkahi: '',
  pangalan: '',
  contactNumber: '',
  emailAddress: '',
};
