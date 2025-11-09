import dayjs from 'dayjs';
import { StudyState, StudySettings } from './types';

const STORAGE_KEY = 'lifehub.study.state';
const CURRENT_SCHEMA = 1;

const defaultSettings: StudySettings = {
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  defaultFocusMinutesWork: 25,
  defaultFocusMinutesBreak: 5,
  maxLecturesPerDay: 5,
  maxMinutesPerDay: 240,
  streakMinLecturesOrMinutes: {
    minLectures: 1,
    minMinutes: 15,
  },
  autoReplanEnabled: true,
};

export const createEmptyState = (): StudyState => ({
  schemaVersion: CURRENT_SCHEMA,
  subjects: [],
  lectures: [],
  studyDays: [],
  dayMeta: [],
  settings: defaultSettings,
  focusSession: null,
});

const migrateState = (raw: any): StudyState => {
  if (!raw || typeof raw !== 'object') {
    return createEmptyState();
  }

  const schemaVersion: number = raw.schemaVersion ?? 0;
  let state = { ...createEmptyState(), ...raw } as StudyState;

  if (schemaVersion < 1) {
    state = {
      ...state,
      schemaVersion: CURRENT_SCHEMA,
      studyDays: (state.studyDays || []).map((day) => ({
        completedMinutes: day.completedMinutes ?? 0,
        targetLectures: day.targetLectures ?? [],
        completedLectures: day.completedLectures ?? [],
        date: day.date,
        isRestDay: day.isRestDay,
        targetMinutes: day.targetMinutes,
      })),
      subjects: (state.subjects || []).map((subject) => ({
        ...subject,
        revisionPasses: subject.revisionPasses ?? [],
      })),
    };
  }

  state.schemaVersion = CURRENT_SCHEMA;
  return state;
};

export const loadState = (): StudyState => {
  if (typeof window === 'undefined') {
    return createEmptyState();
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return createEmptyState();
    }
    const parsed = JSON.parse(stored);
    return migrateState(parsed);
  } catch (error) {
    console.warn('Failed to load study state', error);
    return createEmptyState();
  }
};

export const saveState = (state: StudyState) => {
  if (typeof window === 'undefined') return;
  try {
    const normalized = {
      ...state,
      studyDays: state.studyDays.map((day) => ({
        ...day,
        date: dayjs(day.date).format('YYYY-MM-DD'),
      })),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch (error) {
    console.warn('Failed to save study state', error);
  }
};

export const clearState = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
};
