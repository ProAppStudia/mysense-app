import { University } from './university.model';
import { DoctorFile } from './doctor-file.model';
import { Calendar } from './calendar.model';
import { Review } from './review.model';

export interface DoctorCardView {
  id: number | string;
  fullName: string;
  city?: string;
  city_id?: number | string; // Add city_id
  avatarUrl?: string;
  online?: boolean;
  inPerson?: boolean;
  specialization?: string;
  direction_id?: number | string; // Add direction_id
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
  doctorFiles?: DoctorFile[];
  calendar?: Calendar;
  reviews?: Review[];
}
