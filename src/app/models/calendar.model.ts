export interface TimeSlot {
  time: number;
  disabled: boolean;
  date?: string;
}

export interface Day {
  day_name: string;
  day_no: string;
  times: TimeSlot[];
}

export interface Week {
  week: string;
  active: boolean;
  'date-form': string;
  'date-to': string;
  days: { [key: string]: Day };
}

export interface Calendar {
  weeks: { [key: string]: Week };
}
