import dayjs from 'dayjs';
import { PlannedLecture, StudyDay, StudyState, PlannerChange } from './types';

const blocks = ['morning', 'afternoon', 'evening'];

const ensureStudyDay = (state: StudyState, date: string): StudyDay => {
  const existing = state.studyDays.find((day) => day.date === date);
  if (existing) return existing;
  const newDay: StudyDay = {
    date,
    completedMinutes: 0,
    targetLectures: [],
    completedLectures: [],
  };
  state.studyDays = [...state.studyDays, newDay];
  return newDay;
};

const removeSubjectTargets = (day: StudyDay, subjectId: string) => {
  day.targetLectures = day.targetLectures.filter((target) => target.subjectId !== subjectId || target.isRevision);
};

const assignBlock = (index: number): string => {
  if (index < blocks.length) return blocks[index];
  return `slot-${index + 1}`;
};

export interface PlannerResult {
  state: StudyState;
  change: PlannerChange;
  warnings: string[];
}

export const generateSubjectPlan = (state: StudyState, subjectId: string): PlannerResult => {
  const subject = state.subjects.find((s) => s.id === subjectId);
  if (!subject) {
    throw new Error('Subject not found');
  }

  const today = dayjs().startOf('day');
  const examDate = dayjs(subject.examDate).startOf('day');
  const cutoff = examDate.subtract(subject.reservedRevisionDays ?? 0, 'day');
  const availableLectures = state.lectures
    .filter((lecture) => lecture.subjectId === subjectId && lecture.status !== 'done')
    .sort((a, b) => a.order - b.order);

  let previousTotal = 0;
  let previousDays = 0;
  state.studyDays.forEach((day) => {
    const count = day.targetLectures.filter((item) => item.subjectId === subjectId && !item.isRevision).length;
    if (count > 0) {
      previousTotal += count;
      previousDays += 1;
    }
  });
  const previousAverage = previousDays > 0 ? previousTotal / previousDays : 0;

  const warnings: string[] = [];
  if (!availableLectures.length) {
    return { state, change: { subjectId, previousAverage, newAverage: 0, overloaded: false }, warnings };
  }

  if (!cutoff.isValid() || cutoff.isBefore(today)) {
    warnings.push('Exam is very close. The planner may overload upcoming days.');
  }

  const days: StudyDay[] = [];
  let cursor = today.clone();
  const end = cutoff.isValid() && cutoff.isAfter(today) ? cutoff : today.add(Math.max(availableLectures.length - 1, 0), 'day');

  while (cursor.isSame(end) || cursor.isBefore(end)) {
    const dateStr = cursor.format('YYYY-MM-DD');
    const day = ensureStudyDay(state, dateStr);
    days.push(day);
    cursor = cursor.add(1, 'day');
  }

  const activeDays = days.filter((day) => !day.isRestDay);
  if (!activeDays.length) {
    warnings.push('All days before the exam are marked as rest days. Using them anyway for planning.');
  }

  const planningDays = activeDays.length ? activeDays : days;
  planningDays.forEach((day) => removeSubjectTargets(day, subjectId));

  const maxLectures = state.settings.maxLecturesPerDay ?? Infinity;
  const maxMinutes = state.settings.maxMinutesPerDay ?? Infinity;

  const dayAssignments = new Map<string, PlannedLecture[]>();
  const dayMinutes = new Map<string, number>();
  planningDays.forEach((day) => {
    dayAssignments.set(day.date, []);
    dayMinutes.set(day.date, day.targetMinutes ?? 0);
  });

  let overloaded = false;

  availableLectures.forEach((lecture) => {
    let assignedDay = planningDays[0];
    for (const day of planningDays) {
      const assignments = dayAssignments.get(day.date)!;
      const minutes = dayMinutes.get(day.date)!;
      const withinLectureCap = assignments.length < maxLectures;
      const withinMinuteCap = minutes + lecture.estimatedMinutes <= maxMinutes;
      if (withinLectureCap && withinMinuteCap) {
        assignedDay = day;
        break;
      }
    }

    if (!assignedDay) {
      assignedDay = planningDays[planningDays.length - 1];
      overloaded = true;
    }

    const assignments = dayAssignments.get(assignedDay.date)!;
    if (assignments.length >= maxLectures) {
      overloaded = true;
    }

    const planned: PlannedLecture = {
      subjectId,
      lectureId: lecture.id,
      block: assignBlock(assignments.length),
    };
    assignments.push(planned);
    dayAssignments.set(assignedDay.date, assignments);
    const newMinutes = dayMinutes.get(assignedDay.date)! + lecture.estimatedMinutes;
    dayMinutes.set(assignedDay.date, newMinutes);
  });

  planningDays.forEach((day) => {
    const assignments = dayAssignments.get(day.date) ?? [];
    const plannedIds = new Set(assignments.map((item) => item.lectureId));
    day.targetLectures = [
      ...day.targetLectures.filter((item) => item.subjectId !== subjectId || item.isRevision),
      ...assignments,
    ];
    if (assignments.length > 0) {
      const minutes = dayMinutes.get(day.date) ?? assignments.reduce((sum, lecture) => {
        const targetLecture = state.lectures.find((item) => item.id === lecture.lectureId);
        return sum + (targetLecture?.estimatedMinutes ?? 30);
      }, 0);
      day.targetMinutes = minutes;
    }
    if (day.completedLectures.length) {
      day.completedLectures = day.completedLectures.filter(
        (lecture) => plannedIds.has(lecture.lectureId) || lecture.isRevision,
      );
    }
  });

  const newAverage = availableLectures.length / Math.max(1, planningDays.length);

  state.studyDays = [...state.studyDays].sort((a, b) => a.date.localeCompare(b.date));

  return {
    state: { ...state },
    change: { subjectId, previousAverage, newAverage, overloaded },
    warnings,
  };
};

export const redistributeBacklog = (state: StudyState, subjectId: string) => {
  const subject = state.subjects.find((s) => s.id === subjectId);
  if (!subject) return;

  const pendingTargets = state.studyDays.flatMap((day) =>
    day.targetLectures.filter((item) => item.subjectId === subjectId && !item.isRevision),
  );

  if (!pendingTargets.length) return;

  generateSubjectPlan(state, subjectId);
};

export const addEmptyDayRange = (state: StudyState, start: string, end: string) => {
  let cursor = dayjs(start);
  const finish = dayjs(end);
  while (cursor.isSame(finish) || cursor.isBefore(finish)) {
    ensureStudyDay(state, cursor.format('YYYY-MM-DD'));
    cursor = cursor.add(1, 'day');
  }
  state.studyDays = [...state.studyDays].sort((a, b) => a.date.localeCompare(b.date));
};
