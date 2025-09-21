import { University } from './university.model';

export interface DoctorCardView {
  id: number | string;
  fullName: string;
  city?: string;
  avatarUrl?: string;
  online?: boolean;
  inPerson?: boolean;
  specialization?: string;
  experienceYears?: number | string;
  sessionsCount?: number | string;
  feedbackCount?: number | string;
  introMinutes?: number | string;
  priceIndividual?: number | string;
  priceFamily?: number | string;
  verified?: boolean;
  videoAppealUrl?: string;
  workWithTypes?: string[];
  worksWith?: string[];
  doNotWorkWith?: string[];
  worksWithMilitary?: boolean;
  worksWithLgbt?: boolean;
  languages?: string[];
  description?: string;
  universities?: University[];
}
