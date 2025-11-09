export type Difficulty = 'easy' | 'medium' | 'hard';
export type LectureType = 'lecture' | 'section' | 'mcq' | 'case' | 'other';
export type LectureStatus = 'not_started' | 'in_progress' | 'done' | 'needs_revision';
export type LecturePriority = 'low' | 'normal' | 'high';
export type PlannerBlock = 'morning' | 'afternoon' | 'evening' | string;
export type RevisionTrigger = 'after_finish' | 'before_exam';

export interface RevisionPass {
  id: string;
  subjectId: string;
  name: string;
  trigger: RevisionTrigger;
  offsetDaysBeforeExam?: number;
  includeTags?: string[];
  includeStatuses?: ('done' | 'needs_revision')[];
  spreadOverDays?: number;
}

export interface Subject {
  id: string;
  name: string;
  color: string;
  examDate: string;
  totalLectures: number;
  reservedRevisionDays: number;
  difficulty: Difficulty;
  weight: number;
  archived?: boolean;
  notes?: string;
  revisionPasses?: RevisionPass[];
}

export interface Lecture {
  id: string;
  subjectId: string;
  title: string;
  order: number;
  type: LectureType;
  status: LectureStatus;
  estimatedMinutes: number;
  tags: string[];
  sourceLink?: string;
  priority?: LecturePriority;
}

export interface PlannedLecture {
  subjectId: string;
  lectureId: string;
  block?: PlannerBlock;
  isRevision?: boolean;
}

export interface StudyDay {
  date: string;
  isRestDay?: boolean;
  targetMinutes?: number;
  completedMinutes: number;
  targetLectures: PlannedLecture[];
  completedLectures: PlannedLecture[];
}

export interface DayMeta {
  date: string;
  mood?: number;
  energy?: number;
}

export interface StudySettings {
  timezone: string;
  defaultFocusMinutesWork: number;
  defaultFocusMinutesBreak: number;
  maxLecturesPerDay?: number;
  maxMinutesPerDay?: number;
  streakMinLecturesOrMinutes: {
    minLectures: number;
    minMinutes: number;
  };
  autoReplanEnabled: boolean;
}

export interface StudyState {
  schemaVersion: number;
  subjects: Subject[];
  lectures: Lecture[];
  studyDays: StudyDay[];
  dayMeta: DayMeta[];
  settings: StudySettings;
  focusSession?: ActiveFocusSession | null;
}

export interface ActiveFocusSession {
  lectureId: string;
  subjectId: string;
  startedAt: string;
  durationMinutes: number;
  remainingSeconds: number;
  isRunning: boolean;
}

export type StudyEvent =
  | { type: 'studyDayUpdated'; payload: { date: string; completedMinutes: number; completedLecturesCount: number } }
  | { type: 'studyPlanRecalculated'; payload: { subjectsAffected: string[]; overloaded: boolean } }
  | { type: 'examScheduleChanged'; payload: { subjectId: string; oldExamDate: string; newExamDate: string } };

export interface StudySectionProps {
  onEvent?: (event: StudyEvent) => void;
  initialState?: StudyState;
}

export type PlannerChange = {
  subjectId: string;
  previousAverage: number;
  newAverage: number;
  overloaded: boolean;
};
