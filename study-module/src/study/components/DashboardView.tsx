import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import clsx from 'clsx';
import { SectionView } from '../StudySection';
import { useStudyActions, useStudyState } from '../state';
import {
  computeWeekStats,
  getNextExamSubject,
  getSubjectLectures,
  getSubjectProgress,
  nextLectureForToday,
  todayLabel,
} from '../utils/selectors';
import { PlannedLecture } from '../types';

interface DashboardViewProps {
  onNavigate: (view: SectionView) => void;
}

type ViewMode = 'subject' | 'day';
type QuickActionMode = 'lecture' | 'session';

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const state = useStudyState();
  const actions = useStudyActions();
  const [mode, setMode] = useState<ViewMode>('subject');
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [showQuickAction, setShowQuickAction] = useState(false);
  const [quickMode, setQuickMode] = useState<QuickActionMode>('lecture');
  const [quickForm, setQuickForm] = useState({
    subjectId: '',
    title: '',
    minutes: 45,
    block: 'morning',
  });

  const nextExam = useMemo(() => getNextExamSubject(state.subjects), [state.subjects]);
  const todayPlan = useMemo(() => state.studyDays.find((day) => day.date === dayjs().format('YYYY-MM-DD')), [state.studyDays]);
  const nextUp = useMemo(() => nextLectureForToday(state), [state]);
  const weekStats = useMemo(() => computeWeekStats(state), [state]);

  const subjectsActive = useMemo(() => state.subjects.filter((subject) => !subject.archived), [state.subjects]);
  const totalRemainingLectures = useMemo(
    () =>
      subjectsActive.reduce((acc, subject) => {
        const lectures = getSubjectLectures(state, subject.id);
        const { remaining } = getSubjectProgress(lectures);
        return acc + remaining;
      }, 0),
    [subjectsActive, state],
  );

  const daysUntilExam = useMemo(() => {
    if (!nextExam) return '—';
    const diff = dayjs(nextExam.examDate).startOf('day').diff(dayjs().startOf('day'), 'day');
    return diff >= 0 ? diff : '—';
  }, [nextExam]);

  const selectedDay = state.studyDays.find((day) => day.date === selectedDate);

  const handleQuickSubmit = () => {
    if (!quickForm.subjectId) return;
    if (quickMode === 'lecture') {
      const lectureId = actions.upsertLecture({
        subjectId: quickForm.subjectId,
        title: quickForm.title || 'Untitled lecture',
        estimatedMinutes: quickForm.minutes,
        order: getSubjectLectures(state, quickForm.subjectId).length + 1,
      });
      const planned: PlannedLecture = {
        subjectId: quickForm.subjectId,
        lectureId,
        block: quickForm.block,
      };
      actions.assignLectureToDay(selectedDate, planned, quickForm.minutes);
    } else {
      actions.addQuickStudySession(quickForm.subjectId, quickForm.minutes, selectedDate);
    }
    setShowQuickAction(false);
    setQuickForm({ subjectId: '', title: '', minutes: 45, block: 'morning' });
  };

  const miniCalendar = useMemo(() => {
    const start = dayjs().subtract(2, 'day');
    return Array.from({ length: 7 }).map((_, idx) => {
      const date = start.add(idx, 'day');
      const iso = date.format('YYYY-MM-DD');
      const dayData = state.studyDays.find((day) => day.date === iso);
      const planned = dayData?.targetLectures.length ?? 0;
      const done = dayData?.completedLectures.length ?? 0;
      return {
        iso,
        label: date.format('DD MMM'),
        planned,
        done,
        isToday: date.isSame(dayjs(), 'day'),
      };
    });
  }, [state.studyDays]);

  return (
    <div className="study-dashboard">
      <header className="study-dashboard__header">
        <div>
          <h1>Study · المذاكرة</h1>
          <p className="study-dashboard__subtitle">Your focused space for exams, lectures, and revision.</p>
        </div>
        <button className="study-button secondary" onClick={() => onNavigate({ type: 'stats' })}>
          View stats & streaks
        </button>
      </header>

      <section className="summary-grid">
        <div className="summary-card">
          <span className="summary-label">Next exam</span>
          <h3>{nextExam ? nextExam.name : 'No upcoming exams'}</h3>
          <p>{nextExam ? dayjs(nextExam.examDate).format('DD MMM YYYY') : 'Add a subject to begin planning.'}</p>
        </div>
        <div className="summary-card">
          <span className="summary-label">Days until exam</span>
          <h3>{daysUntilExam}</h3>
          <p>Stay consistent — we’ll adjust plans automatically.</p>
        </div>
        <div className="summary-card">
          <span className="summary-label">Remaining lectures</span>
          <h3>{totalRemainingLectures}</h3>
          <p>Across all active subjects.</p>
        </div>
        <div className="summary-card">
          <span className="summary-label">Today’s progress</span>
          <h3>
            {todayPlan ? `${todayPlan.completedLectures.length} / ${todayPlan.targetLectures.length}` : '0 / 0'} lectures
          </h3>
          <p>{todayPlan ? `${todayPlan.completedMinutes} / ${todayPlan.targetMinutes ?? 0} minutes` : 'Log a session to begin.'}</p>
        </div>
      </section>

      <section className="next-up-card">
        <div>
          <h2>Next up</h2>
          {nextUp ? (
            <p>
              {(() => {
                const lecture = state.lectures.find((item) => item.id === nextUp.lectureId);
                const subject = state.subjects.find((item) => item.id === nextUp.subjectId);
                if (!lecture || !subject) return 'All clear for today!';
                return `${subject.name} · ${lecture.title}`;
              })()}
            </p>
          ) : (
            <p>No more lectures planned for today. Great job!</p>
          )}
        </div>
        {nextUp && (
          <button className="study-button" onClick={() => onNavigate({ type: 'focus', lectureId: nextUp.lectureId })}>
            Start focus session
          </button>
        )}
      </section>

      <div className="view-toggle">
        <button className={clsx('toggle-btn', mode === 'subject' && 'active')} onClick={() => setMode('subject')}>
          By subject
        </button>
        <button className={clsx('toggle-btn', mode === 'day' && 'active')} onClick={() => setMode('day')}>
          By day
        </button>
      </div>

      {mode === 'subject' ? (
        <section className="subjects-grid">
          {subjectsActive.length === 0 && (
            <div className="empty-state">
              <h3>No subjects yet</h3>
              <p>Add your first subject to start planning your study journey.</p>
              <button
                className="study-button"
                onClick={() => {
                  const subjectId = actions.upsertSubject({ name: 'New subject' });
                  onNavigate({ type: 'subject', subjectId });
                }}
              >
                Add subject
              </button>
            </div>
          )}
          {subjectsActive.map((subject) => {
            const lectures = getSubjectLectures(state, subject.id);
            const { done, total, remaining } = getSubjectProgress(lectures);
            const daysLeft = dayjs(subject.examDate).startOf('day').diff(dayjs().startOf('day'), 'day');
            const todayTargets = state.studyDays
              .find((day) => day.date === dayjs().format('YYYY-MM-DD'))
              ?.targetLectures.filter((lecture) => lecture.subjectId === subject.id).length ?? 0;
            const atRisk =
              subject.totalLectures > 0 &&
              remaining / Math.max(1, daysLeft - subject.reservedRevisionDays) >
                (state.settings.maxLecturesPerDay ?? 5);
            return (
              <button key={subject.id} className="subject-card" onClick={() => onNavigate({ type: 'subject', subjectId: subject.id })}>
                <div className="subject-card__header">
                  <span className="subject-color" style={{ background: subject.color }} />
                  <h3>{subject.name}</h3>
                </div>
                <p className="subject-card__exam">Exam · {dayjs(subject.examDate).format('DD MMM')}</p>
                <div className="subject-card__progress">
                  <div className="progress-bar">
                    <div className="progress-bar__fill" style={{ width: `${total ? Math.round((done / total) * 100) : 0}%`, background: subject.color }} />
                  </div>
                  <span>
                    {done}/{total} completed
                  </span>
                </div>
                <div className="subject-card__meta">
                  <span>{remaining} remaining</span>
                  <span>Today: {todayTargets}</span>
                </div>
                <div className="subject-card__footer">
                  <span>Difficulty: {subject.difficulty}</span>
                  <span>Revision days: {subject.reservedRevisionDays}</span>
                </div>
                {atRisk && <span className="badge badge-warning">At risk</span>}
              </button>
            );
          })}
        </section>
      ) : (
        <section className="day-view">
          <div className="mini-calendar">
            {miniCalendar.map((item) => (
              <button
                key={item.iso}
                className={clsx('mini-calendar__day', selectedDate === item.iso && 'active')}
                onClick={() => setSelectedDate(item.iso)}
              >
                <span>{item.label}</span>
                <small>
                  {item.done}/{item.planned}
                </small>
              </button>
            ))}
          </div>
          <div className="day-details">
            <div className="day-details__header">
              <div>
                <h2>{todayLabel(selectedDate)}</h2>
                <p>{dayjs(selectedDate).format('dddd, DD MMMM')}</p>
              </div>
              <div className="day-details__meta">
                <span className={clsx('badge', selectedDay?.isRestDay && 'badge-warning')}>
                  {selectedDay?.isRestDay ? 'Rest / Light day' : 'Focus day'}
                </span>
                <span className="badge">
                  {selectedDay ? `${selectedDay.completedLectures.length}/${selectedDay.targetLectures.length} lectures` : '0/0 lectures'}
                </span>
              </div>
            </div>
            <div className="day-blocks">
              {['morning', 'afternoon', 'evening'].map((block) => {
                const tasks = selectedDay?.targetLectures.filter((item) => (item.block ?? 'morning') === block) ?? [];
                return (
                  <div key={block} className="day-block">
                    <h3>{block.charAt(0).toUpperCase() + block.slice(1)}</h3>
                    {tasks.length === 0 && <p className="muted">No tasks planned.</p>}
                    {tasks.map((task) => {
                      const lecture = state.lectures.find((item) => item.id === task.lectureId);
                      const subject = state.subjects.find((item) => item.id === task.subjectId);
                      const completed = selectedDay?.completedLectures.some((item) => item.lectureId === task.lectureId);
                      return (
                        <label key={task.lectureId} className={clsx('day-task', completed && 'completed')}>
                          <input
                            type="checkbox"
                            checked={completed}
                            onChange={(event) =>
                              actions.togglePlannedLectureCompletion(selectedDate, task, event.target.checked)
                            }
                          />
                          <span className="task-color" style={{ background: subject?.color ?? '#4c6ef5' }} />
                          <div>
                            <strong>{lecture?.title ?? 'Lecture'}</strong>
                            <p>{subject?.name ?? ''}</p>
                          </div>
                          <span className="muted">{lecture?.estimatedMinutes ?? 45}m</span>
                        </label>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            <div className="day-progress">
              <h3>Today’s progress</h3>
              <p>
                {selectedDay
                  ? `${selectedDay.completedLectures.length} / ${selectedDay.targetLectures.length} lectures · ${selectedDay.completedMinutes} / ${selectedDay.targetMinutes ?? 0} minutes`
                  : 'No plan yet. Add tasks to get started.'}
              </p>
              <button className="study-button secondary" onClick={() => actions.setRestDay(selectedDate, !(selectedDay?.isRestDay ?? false))}>
                {selectedDay?.isRestDay ? 'Mark as focus day' : 'Mark as rest day'}
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="stats-preview">
        <div>
          <h3>This week</h3>
          <p>{weekStats.totalMinutes} minutes · {weekStats.lecturesCompleted} lectures</p>
        </div>
        <div>
          <h3>Most studied</h3>
          <p>
            {weekStats.mostStudiedSubjectId
              ? state.subjects.find((item) => item.id === weekStats.mostStudiedSubjectId)?.name ?? '—'
              : '—'}
            {weekStats.mostStudiedCount ? ` · ${weekStats.mostStudiedCount} lectures` : ''}
          </p>
        </div>
        <div>
          <h3>Plan adherence</h3>
          <p>{weekStats.adherence}%</p>
        </div>
        <div>
          <h3>Streak</h3>
          <p>{weekStats.streak} days</p>
        </div>
      </section>

      <button className="fab" onClick={() => setShowQuickAction(true)}>
        + Quick action
      </button>

      {showQuickAction && (
        <div className="quick-action">
          <div className="quick-action__header">
            <div className="quick-action__toggle">
              <button className={clsx(quickMode === 'lecture' && 'active')} onClick={() => setQuickMode('lecture')}>
                Add lecture
              </button>
              <button className={clsx(quickMode === 'session' && 'active')} onClick={() => setQuickMode('session')}>
                Log session
              </button>
            </div>
            <button className="icon-button" onClick={() => setShowQuickAction(false)} aria-label="Close">
              ×
            </button>
          </div>
          <div className="quick-action__form">
            <label>
              Subject
              <select
                value={quickForm.subjectId}
                onChange={(event) => setQuickForm((prev) => ({ ...prev, subjectId: event.target.value }))}
              >
                <option value="">Select subject</option>
                {state.subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </label>
            {quickMode === 'lecture' && (
              <label>
                Lecture title
                <input
                  type="text"
                  value={quickForm.title}
                  onChange={(event) => setQuickForm((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="e.g. Pathology – Chapter 4"
                />
              </label>
            )}
            <label>
              Minutes
              <input
                type="number"
                min={5}
                value={quickForm.minutes}
                onChange={(event) => setQuickForm((prev) => ({ ...prev, minutes: Number(event.target.value) }))}
              />
            </label>
            {quickMode === 'lecture' && (
              <label>
                Block
                <select value={quickForm.block} onChange={(event) => setQuickForm((prev) => ({ ...prev, block: event.target.value }))}>
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                  <option value="evening">Evening</option>
                </select>
              </label>
            )}
            <div className="quick-action__footer">
              <button className="study-button" onClick={handleQuickSubmit}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
