export interface FormData {
  pangalanNgTanggapan: string;
  serbisyongIbinigay: string;
  serbisyongIba: string;           // "Other/s" follow-up text
  uriNgKliyente: string;
  edad: string;
  kasarian: string;
  rehiyon: string;
  cc1: string;
  cc2: string;
  cc3: string;
  sqd: string[];                   // 9 items: SQD0–SQD8
  mgaMungkahi: string;
  pangalan: string;
  contactNumber: string;
  emailAddress: string;
}

export type StepId =
  | 'pangalan'
  | 'demographics'
  | 'cc1'
  | 'cc2'
  | 'cc3'
  | 'sqd0'
  | 'sqd1'
  | 'sqd2'
  | 'sqd3'
  | 'sqd4'
  | 'sqd5'
  | 'sqd6'
  | 'sqd7'
  | 'sqd8'
  | 'mungkahi'
  | 'contact';

export const STEPS: StepId[] = [
  'pangalan',
  'demographics',
  'cc1',
  'cc2',
  'cc3',
  'sqd0',
  'sqd1',
  'sqd2',
  'sqd3',
  'sqd4',
  'sqd5',
  'sqd6',
  'sqd7',
  'sqd8',
  'mungkahi',
  'contact',
];

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
  sqd: ['', '', '', '', '', 'N/A', '', '', ''], // SQD5 default N/A
  mgaMungkahi: '',
  pangalan: '',
  contactNumber: '',
  emailAddress: '',
};
