import React, { useMemo, useState, useEffect, useCallback } from 'react';
import dayjs from 'dayjs';
import { nanoid } from 'nanoid';
import { Lecture, LectureStatus, PlannedLecture, RevisionPass, StudySectionProps, StudyState, Subject, StudySettings } from './types';
import { createEmptyState, loadState, saveState } from './storage';
import { studyEventBus } from './events';
import { generateSubjectPlan, PlannerResult } from './planner';
import { getOrCreateStudyDay } from './utils/selectors';

interface StudyActions {
  upsertSubject(subject: Partial<Subject> & { id?: string }): string;
  updateSubject(subjectId: string, updates: Partial<Subject>): void;
  upsertLecture(lecture: Partial<Lecture> & { subjectId: string; id?: string }): string;
  updateLecture(lectureId: string, updates: Partial<Lecture>): void;
  markLectureStatus(lectureId: string, status: LectureStatus): void;
  togglePlannedLectureCompletion(date: string, planned: PlannedLecture, completed: boolean): void;
  assignLectureToDay(date: string, planned: PlannedLecture, estimatedMinutes?: number): void;
  logCompletedMinutes(date: string, minutes: number): void;
  setRestDay(date: string, isRestDay: boolean): void;
  updateSettings(settings: Partial<StudySettings>): void;
  generatePlanForSubject(subjectId: string): PlannerResult | null;
  addRevisionPass(subjectId: string, pass: Omit<RevisionPass, 'id' | 'subjectId'>): string;
  updateRevisionPass(passId: string, updates: Partial<RevisionPass>): void;
  deleteRevisionPass(passId: string): void;
  startFocusSession(lectureId: string, durationMinutes?: number): void;
  updateFocusSession(deltaSeconds: number, isRunning: boolean): void;
  endFocusSession(result: 'finished' | 'not_finished' | 'needs_revision', minutes: number): void;
  addQuickStudySession(subjectId: string, minutes: number, date?: string): void;
}

const StudyStateContext = React.createContext<StudyState>(createEmptyState());
const StudyActionsContext = React.createContext<StudyActions | undefined>(undefined);

export const StudyProvider: React.FC<StudySectionProps & { children: React.ReactNode }> = ({
  children,
  initialState,
}) => {
  const [state, setState] = useState<StudyState>(() => initialState ?? loadState());

  useEffect(() => {
    saveState(state);
  }, [state]);

  const updateState = useCallback((updater: (prev: StudyState) => StudyState) => {
    setState((prev) => updater({ ...prev, studyDays: [...prev.studyDays] }));
  }, []);

  const actions = useMemo<StudyActions>(() => ({
    upsertSubject: (subject) => {
      let id = subject.id ?? nanoid();
      updateState((prev) => {
        const existingIndex = prev.subjects.findIndex((item) => item.id === id);
        const payload: Subject = {
          id,
          name: subject.name ?? 'Untitled subject',
          color: subject.color ?? '#4c6ef5',
          examDate: subject.examDate ?? dayjs().add(30, 'day').format('YYYY-MM-DD'),
          totalLectures: subject.totalLectures ?? 0,
          reservedRevisionDays: subject.reservedRevisionDays ?? 3,
          difficulty: subject.difficulty ?? 'medium',
          weight: subject.weight ?? 1,
          notes: subject.notes,
          archived: subject.archived ?? false,
          revisionPasses: subject.revisionPasses ?? [],
        };
        if (existingIndex >= 0) {
          const nextSubjects = [...prev.subjects];
          nextSubjects[existingIndex] = { ...nextSubjects[existingIndex], ...payload };
          return { ...prev, subjects: nextSubjects };
        }
        return { ...prev, subjects: [...prev.subjects, payload] };
      });
      return id;
    },
    assignLectureToDay: (date, planned, estimatedMinutes) => {
      updateState((prev) => {
        const day = getOrCreateStudyDay(prev, date);
        const existing = day.targetLectures.find((item) => item.lectureId === planned.lectureId);
        let targetLectures = [...day.targetLectures];
        if (!existing) {
          targetLectures = [...targetLectures, planned];
        }
        const minutes = estimatedMinutes ??
          prev.lectures.find((lecture) => lecture.id === planned.lectureId)?.estimatedMinutes ?? 30;
        const targetMinutes = (day.targetMinutes ?? 0) + (existing ? 0 : minutes);
        const updatedDay = { ...day, targetLectures, targetMinutes };
        return {
          ...prev,
          studyDays: prev.studyDays.map((item) => (item.date === date ? updatedDay : item)),
        };
      });
    },
    updateSubject: (subjectId, updates) => {
      updateState((prev) => {
        const nextSubjects = prev.subjects.map((subject) => {
          if (subject.id !== subjectId) return subject;
          const oldExamDate = subject.examDate;
          const updated = { ...subject, ...updates };
          if (updates.examDate && updates.examDate !== oldExamDate) {
            studyEventBus.emit({
              type: 'examScheduleChanged',
              payload: { subjectId, oldExamDate, newExamDate: updates.examDate },
            });
          }
          return updated;
        });
        return { ...prev, subjects: nextSubjects };
      });
    },
    upsertLecture: (lecture) => {
      const id = lecture.id ?? nanoid();
      updateState((prev) => {
        const payload: Lecture = {
          id,
          subjectId: lecture.subjectId,
          title: lecture.title ?? 'Untitled lecture',
          order: lecture.order ?? prev.lectures.filter((item) => item.subjectId === lecture.subjectId).length + 1,
          type: lecture.type ?? 'lecture',
          status: lecture.status ?? 'not_started',
          estimatedMinutes: lecture.estimatedMinutes ?? 45,
          tags: lecture.tags ?? [],
          sourceLink: lecture.sourceLink,
          priority: lecture.priority ?? 'normal',
        };
        const existingIndex = prev.lectures.findIndex((item) => item.id === id);
        if (existingIndex >= 0) {
          const nextLectures = [...prev.lectures];
          nextLectures[existingIndex] = { ...nextLectures[existingIndex], ...payload };
          return { ...prev, lectures: nextLectures };
        }
        return { ...prev, lectures: [...prev.lectures, payload] };
      });
      return id;
    },
    updateLecture: (lectureId, updates) => {
      updateState((prev) => {
        const nextLectures: Lecture[] = prev.lectures.map((lecture) =>
          lecture.id === lectureId ? { ...lecture, ...updates } : lecture,
        );
        return { ...prev, lectures: nextLectures };
      });
    },
    markLectureStatus: (lectureId, status) => {
      updateState((prev) => {
        const nextLectures: Lecture[] = prev.lectures.map((lecture) =>
          lecture.id === lectureId ? { ...lecture, status } : lecture,
        );
        return { ...prev, lectures: nextLectures };
      });
    },
    togglePlannedLectureCompletion: (date, planned, completed) => {
      updateState((prev) => {
        const day = getOrCreateStudyDay(prev, date);
        const alreadyCompleted = day.completedLectures.find(
          (item) => item.lectureId === planned.lectureId,
        );
        let completedLectures = [...day.completedLectures];
        if (completed && !alreadyCompleted) {
          completedLectures = [...completedLectures, planned];
        }
        if (!completed && alreadyCompleted) {
          completedLectures = completedLectures.filter((item) => item.lectureId !== planned.lectureId);
        }

        const nextLectures: Lecture[] = prev.lectures.map((lecture) => {
          if (lecture.id !== planned.lectureId) return lecture;
          if (completed) return { ...lecture, status: 'done' as LectureStatus };
          if (lecture.status === 'done') return { ...lecture, status: 'in_progress' as LectureStatus };
          return lecture;
        });

        const updatedDay = { ...day, completedLectures };
        studyEventBus.emit({
          type: 'studyDayUpdated',
          payload: {
            date,
            completedMinutes: updatedDay.completedMinutes,
            completedLecturesCount: updatedDay.completedLectures.length,
          },
        });
        return {
          ...prev,
          studyDays: prev.studyDays.map((item) => (item.date === date ? updatedDay : item)),
          lectures: nextLectures,
        };
      });
    },
    logCompletedMinutes: (date, minutes) => {
      updateState((prev) => {
        const day = getOrCreateStudyDay(prev, date);
        day.completedMinutes += minutes;
        studyEventBus.emit({
          type: 'studyDayUpdated',
          payload: {
            date,
            completedMinutes: day.completedMinutes,
            completedLecturesCount: day.completedLectures.length,
          },
        });
        return {
          ...prev,
          studyDays: prev.studyDays.map((item) => (item.date === date ? { ...day } : item)),
        };
      });
    },
    setRestDay: (date, isRestDay) => {
      updateState((prev) => {
        const day = getOrCreateStudyDay(prev, date);
        day.isRestDay = isRestDay;
        return {
          ...prev,
          studyDays: prev.studyDays.map((item) => (item.date === date ? { ...day } : item)),
        };
      });
    },
    updateSettings: (settings) => {
      updateState((prev) => ({
        ...prev,
        settings: { ...prev.settings, ...settings },
      }));
    },
    generatePlanForSubject: (subjectId) => {
      let result: PlannerResult | null = null;
      updateState((prev) => {
        const plannerResult = generateSubjectPlan({ ...prev, studyDays: [...prev.studyDays] }, subjectId);
        result = plannerResult;
        studyEventBus.emit({
          type: 'studyPlanRecalculated',
          payload: { subjectsAffected: [subjectId], overloaded: plannerResult.change.overloaded },
        });
        return plannerResult.state;
      });
      return result;
    },
    addRevisionPass: (subjectId, pass) => {
      const id = nanoid();
      updateState((prev) => {
        const nextSubjects = prev.subjects.map((subject) => {
          if (subject.id !== subjectId) return subject;
          const revisionPasses = [...(subject.revisionPasses ?? []), { ...pass, id, subjectId }];
          return { ...subject, revisionPasses };
        });
        return { ...prev, subjects: nextSubjects };
      });
      return id;
    },
    updateRevisionPass: (passId, updates) => {
      updateState((prev) => {
        const nextSubjects = prev.subjects.map((subject) => {
          const revisionPasses = (subject.revisionPasses ?? []).map((pass) =>
            pass.id === passId ? { ...pass, ...updates } : pass,
          );
          return { ...subject, revisionPasses };
        });
        return { ...prev, subjects: nextSubjects };
      });
    },
    deleteRevisionPass: (passId) => {
      updateState((prev) => {
        const nextSubjects = prev.subjects.map((subject) => ({
          ...subject,
          revisionPasses: (subject.revisionPasses ?? []).filter((pass) => pass.id !== passId),
        }));
        return { ...prev, subjects: nextSubjects };
      });
    },
    startFocusSession: (lectureId, durationMinutes) => {
      updateState((prev) => {
        const lecture = prev.lectures.find((item) => item.id === lectureId);
        if (!lecture) return prev;
        const duration = durationMinutes ?? prev.settings.defaultFocusMinutesWork;
        const session = {
          lectureId,
          subjectId: lecture.subjectId,
          startedAt: new Date().toISOString(),
          durationMinutes: duration,
          remainingSeconds: duration * 60,
          isRunning: true,
        };
        return { ...prev, focusSession: session };
      });
    },
    updateFocusSession: (deltaSeconds, isRunning) => {
      updateState((prev) => {
        if (!prev.focusSession) return prev;
        const remaining = Math.max(0, prev.focusSession.remainingSeconds - deltaSeconds);
        return {
          ...prev,
          focusSession: { ...prev.focusSession, remainingSeconds: remaining, isRunning },
        };
      });
    },
    endFocusSession: (result, minutes) => {
      updateState((prev) => {
        if (!prev.focusSession) return prev;
        const session = prev.focusSession;
        const date = dayjs().format('YYYY-MM-DD');
        const day = getOrCreateStudyDay(prev, date);
        let updatedLectures = [...prev.lectures];
        const lectureIndex = updatedLectures.findIndex((item) => item.id === session.lectureId);
        if (lectureIndex >= 0) {
          const lecture = updatedLectures[lectureIndex];
          if (result === 'finished') {
            updatedLectures[lectureIndex] = { ...lecture, status: 'done' };
          } else if (result === 'needs_revision') {
            updatedLectures[lectureIndex] = { ...lecture, status: 'needs_revision' };
          } else {
            updatedLectures[lectureIndex] = { ...lecture, status: 'in_progress' };
          }
        }
        if (result === 'finished') {
          const planned: PlannedLecture = {
            subjectId: session.subjectId,
            lectureId: session.lectureId,
          };
          if (!day.completedLectures.find((item) => item.lectureId === planned.lectureId)) {
            day.completedLectures = [...day.completedLectures, planned];
          }
        }
        if (minutes > 0) {
          day.completedMinutes += minutes;
        }
        studyEventBus.emit({
          type: 'studyDayUpdated',
          payload: {
            date,
            completedMinutes: day.completedMinutes,
            completedLecturesCount: day.completedLectures.length,
          },
        });
        return {
          ...prev,
          lectures: updatedLectures,
          studyDays: prev.studyDays.map((item) => (item.date === date ? { ...day } : item)),
          focusSession: null,
        };
      });
    },
    addQuickStudySession: (subjectId, minutes, date) => {
      const targetDate = date ?? dayjs().format('YYYY-MM-DD');
      updateState((prev) => {
        const day = getOrCreateStudyDay(prev, targetDate);
        day.completedMinutes += minutes;
        studyEventBus.emit({
          type: 'studyDayUpdated',
          payload: {
            date: targetDate,
            completedMinutes: day.completedMinutes,
            completedLecturesCount: day.completedLectures.length,
          },
        });
        return {
          ...prev,
          studyDays: prev.studyDays.map((item) => (item.date === targetDate ? { ...day } : item)),
        };
      });
    },
  }), [updateState]);

  return (
    <StudyStateContext.Provider value={state}>
      <StudyActionsContext.Provider value={actions}>{children}</StudyActionsContext.Provider>
    </StudyStateContext.Provider>
  );
};

export const useStudyState = () => React.useContext(StudyStateContext);
export const useStudyActions = () => {
  const ctx = React.useContext(StudyActionsContext);
  if (!ctx) {
    throw new Error('useStudyActions must be used within StudyProvider');
  }
  return ctx;
};
