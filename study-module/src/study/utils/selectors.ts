import dayjs from 'dayjs';
import { Lecture, LectureStatus, PlannedLecture, StudyDay, StudyState, Subject } from '../types';

export const getSubjectLectures = (state: StudyState, subjectId: string) =>
  state.lectures.filter((lecture) => lecture.subjectId === subjectId);

export const getStudyDay = (state: StudyState, date: string): StudyDay | undefined =>
  state.studyDays.find((day) => day.date === date);

export const getOrCreateStudyDay = (state: StudyState, date: string): StudyDay => {
  let day = state.studyDays.find((item) => item.date === date);
  if (!day) {
    day = {
      date,
      completedMinutes: 0,
      targetLectures: [],
      completedLectures: [],
    };
    state.studyDays = [...state.studyDays, day];
  }
  return day;
};

export const getSubjectProgress = (lectures: Lecture[]) => {
  const total = lectures.length;
  const done = lectures.filter((lecture) => lecture.status === 'done').length;
  const needsRevision = lectures.filter((lecture) => lecture.status === 'needs_revision').length;
  const inProgress = lectures.filter((lecture) => lecture.status === 'in_progress').length;
  return { total, done, remaining: total - done, needsRevision, inProgress };
};

export const getNextExamSubject = (subjects: Subject[]) => {
  const today = dayjs();
  return subjects
    .filter((subject) => !subject.archived)
    .map((subject) => ({ subject, date: dayjs(subject.examDate) }))
    .filter(({ date }) => date.isAfter(today.subtract(1, 'day')))
    .sort((a, b) => a.date.valueOf() - b.date.valueOf())[0]?.subject;
};

export const findLectureById = (state: StudyState, lectureId: string) =>
  state.lectures.find((lecture) => lecture.id === lectureId);

export const nextLectureForToday = (state: StudyState): PlannedLecture | undefined => {
  const today = dayjs().format('YYYY-MM-DD');
  const day = state.studyDays.find((item) => item.date === today);
  if (!day) return undefined;
  const completedIds = new Set(day.completedLectures.map((lecture) => lecture.lectureId));
  return day.targetLectures.find((lecture) => !completedIds.has(lecture.lectureId));
};

export const getLectureStatusLabel = (status: LectureStatus) => {
  switch (status) {
    case 'done':
      return 'مكتمل';
    case 'in_progress':
      return 'قيد التنفيذ';
    case 'needs_revision':
      return 'بحاجة لمراجعة';
    default:
      return 'لم يبدأ بعد';
  }
};

export const computeWeekStats = (state: StudyState) => {
  const today = dayjs();
  const startOfWeek = today.startOf('week');
  let totalMinutes = 0;
  let lecturesCompleted = 0;
  const perSubject = new Map<string, number>();
  let scheduled = 0;

  state.studyDays.forEach((day) => {
    const dayDate = dayjs(day.date);
    if (dayDate.isBefore(startOfWeek) || dayDate.isAfter(today)) return;
    totalMinutes += day.completedMinutes;
    const completedToday = day.completedLectures.length;
    lecturesCompleted += completedToday;
    day.completedLectures.forEach((lecture) => {
      perSubject.set(lecture.subjectId, (perSubject.get(lecture.subjectId) ?? 0) + 1);
    });
    scheduled += day.targetLectures.length;
  });

  const sortedSubjects = Array.from(perSubject.entries()).sort((a, b) => b[1] - a[1]);
  const mostStudiedSubjectId = sortedSubjects[0]?.[0];
  const mostStudiedCount = sortedSubjects[0]?.[1] ?? 0;

  const streak = computeStreak(state);

  return {
    totalMinutes,
    lecturesCompleted,
    mostStudiedSubjectId,
    mostStudiedCount,
    adherence: scheduled ? Math.min(100, Math.round((lecturesCompleted / scheduled) * 100)) : 0,
    streak,
  };
};

export const computeStreak = (state: StudyState) => {
  const today = dayjs();
  const { minLectures, minMinutes } = state.settings.streakMinLecturesOrMinutes;
  let streak = 0;
  let cursor = today.clone();

  while (true) {
    const day = state.studyDays.find((item) => item.date === cursor.format('YYYY-MM-DD'));
    if (!day) break;
    const meetsLecture = day.completedLectures.length >= minLectures;
    const meetsMinutes = day.completedMinutes >= minMinutes;
    if (meetsLecture || meetsMinutes) {
      streak += 1;
    } else {
      break;
    }
    cursor = cursor.subtract(1, 'day');
  }

  return streak;
};

export const todayLabel = (date: string) => {
  const target = dayjs(date);
  const today = dayjs().startOf('day');
  if (target.isSame(today)) return 'اليوم';
  if (target.isSame(today.add(1, 'day'))) return 'غدًا';
  if (target.isSame(today.subtract(1, 'day'))) return 'أمس';
  return target.format('YYYY/MM/DD');
};
