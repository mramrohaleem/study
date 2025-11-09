import { useEffect, useMemo, useState } from 'react';
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
import { Difficulty, LecturePriority, LectureType, PlannedLecture } from '../types';
import { SubjectFormModal } from './SubjectFormModal';
import { LectureFormModal } from './LectureFormModal';

interface DashboardViewProps {
  onNavigate: (view: SectionView) => void;
}

type ViewMode = 'subject' | 'day';

const blockLabels: Record<string, string> = {
  morning: 'الصباح',
  afternoon: 'بعد الظهر',
  evening: 'المساء',
};

const difficultyLabel: Record<Difficulty, string> = {
  easy: 'سهل',
  medium: 'متوسط',
  hard: 'صعب',
};

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const state = useStudyState();
  const actions = useStudyActions();
  const [mode, setMode] = useState<ViewMode>('subject');
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [showLectureForm, setShowLectureForm] = useState(false);
  const [quickSubject, setQuickSubject] = useState('');
  const [quickMinutes, setQuickMinutes] = useState(30);

  useEffect(() => {
    if (!quickSubject && state.subjects.length > 0) {
      setQuickSubject(state.subjects[0].id);
    }
  }, [quickSubject, state.subjects]);

  const nextExam = useMemo(() => getNextExamSubject(state.subjects), [state.subjects]);
  const todayPlan = useMemo(
    () => state.studyDays.find((day) => day.date === dayjs().format('YYYY-MM-DD')),
    [state.studyDays],
  );
  const nextUp = useMemo(() => nextLectureForToday(state), [state]);
  const weekStats = useMemo(() => computeWeekStats(state), [state]);

  const subjectsActive = useMemo(
    () => state.subjects.filter((subject) => !subject.archived),
    [state.subjects],
  );
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
  const selectedMeta = state.dayMeta.find((meta) => meta.date === selectedDate);

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
        label: date.format('DD/MM'),
        planned,
        done,
        isToday: date.isSame(dayjs(), 'day'),
      };
    });
  }, [state.studyDays]);

  const handleCreateSubject = (values: {
    name: string;
    color: string;
    examDate: string;
    difficulty: Difficulty;
    reservedRevisionDays: number;
    weight: number;
    notes?: string;
  }) => {
    const subjectId = actions.upsertSubject({
      name: values.name,
      color: values.color,
      examDate: values.examDate,
      difficulty: values.difficulty,
      reservedRevisionDays: values.reservedRevisionDays,
      weight: values.weight,
      notes: values.notes,
    });
    setShowSubjectForm(false);
    onNavigate({ type: 'subject', subjectId });
  };

  const handleCreateLecture = (values: {
    subjectId: string;
    title: string;
    type: LectureType;
    estimatedMinutes: number;
    priority: LecturePriority;
    tags: string[];
    sourceLink?: string;
    planToDay?: string;
    planBlock?: string;
  }) => {
    const lectureId = actions.upsertLecture({
      subjectId: values.subjectId,
      title: values.title,
      type: values.type,
      estimatedMinutes: values.estimatedMinutes,
      priority: values.priority,
      tags: values.tags,
      sourceLink: values.sourceLink,
    });
    if (values.planToDay) {
      const planned: PlannedLecture = {
        subjectId: values.subjectId,
        lectureId,
        block: values.planBlock ?? 'morning',
      };
      actions.assignLectureToDay(values.planToDay, planned, values.estimatedMinutes);
    }
    setShowLectureForm(false);
    return lectureId;
  };

  const handleMoodChange = (key: 'mood' | 'energy', value?: number) => {
    actions.setDayMeta(selectedDate, { [key]: value } as { mood?: number; energy?: number });
  };

  const handleQuickSession = () => {
    if (!quickSubject || quickMinutes <= 0) return;
    actions.addQuickStudySession(quickSubject, quickMinutes, selectedDate);
    setQuickMinutes(30);
  };

  return (
    <div className="study-dashboard">
      <header className="study-dashboard__header">
        <div>
          <h1>قسم المذاكرة</h1>
          <p className="study-dashboard__subtitle">مساحتك المنظمة للامتحانات والمحاضرات والتخطيط اليومي.</p>
        </div>
        <div className="header-actions">
          <button className="study-button secondary" onClick={() => onNavigate({ type: 'stats' })}>
            الإحصائيات والسلاسل
          </button>
          <button className="study-button secondary" onClick={() => onNavigate({ type: 'settings' })}>
            الإعدادات
          </button>
          <button className="study-button" onClick={() => setShowSubjectForm(true)}>
            إضافة مادة
          </button>
        </div>
      </header>

      <section className="summary-grid">
        <div className="summary-card">
          <span className="summary-label">الاختبار القادم</span>
          <h3>{nextExam ? nextExam.name : 'لا توجد اختبارات قريبة'}</h3>
          <p>{nextExam ? dayjs(nextExam.examDate).format('YYYY/MM/DD') : 'ابدأ بإضافة مادة جديدة للتخطيط.'}</p>
        </div>
        <div className="summary-card">
          <span className="summary-label">الأيام المتبقية</span>
          <h3>{daysUntilExam}</h3>
          <p>حافظ على وتيرة ثابتة وسنعيد توزيع الخطة عند الحاجة.</p>
        </div>
        <div className="summary-card">
          <span className="summary-label">المحاضرات المتبقية</span>
          <h3>{totalRemainingLectures}</h3>
          <p>إجمالي المحاضرات عبر المواد النشطة.</p>
        </div>
        <div className="summary-card">
          <span className="summary-label">إنجاز اليوم</span>
          <h3>{todayPlan ? `${todayPlan.completedLectures.length} / ${todayPlan.targetLectures.length}` : '0 / 0'} محاضرات</h3>
          <p>{todayPlan ? `${todayPlan.completedMinutes} / ${todayPlan.targetMinutes ?? 0} دقيقة` : 'سجل جلسة للبدء.'}</p>
        </div>
      </section>

      <section className="next-up-card">
        <div>
          <h2>المهمة التالية</h2>
          {nextUp ? (
            <p>
              {(() => {
                const lecture = state.lectures.find((item) => item.id === nextUp.lectureId);
                const subject = state.subjects.find((item) => item.id === nextUp.subjectId);
                if (!lecture || !subject) return 'لا مهام حالية لهذا اليوم.';
                return `${subject.name} · ${lecture.title}`;
              })()}
            </p>
          ) : (
            <p>لا توجد محاضرات مجدولة لليوم. أحسنت!</p>
          )}
        </div>
        {nextUp && (
          <button className="study-button" onClick={() => onNavigate({ type: 'focus', lectureId: nextUp.lectureId })}>
            ابدأ جلسة تركيز
          </button>
        )}
      </section>

      <div className="view-toggle">
        <button className={clsx('toggle-btn', mode === 'subject' && 'active')} onClick={() => setMode('subject')}>
          حسب المادة
        </button>
        <button className={clsx('toggle-btn', mode === 'day' && 'active')} onClick={() => setMode('day')}>
          حسب اليوم
        </button>
      </div>

      {mode === 'subject' ? (
        <section className="subjects-grid">
          {subjectsActive.length === 0 && (
            <div className="empty-state">
              <h3>لا توجد مواد بعد</h3>
              <p>أضف أول مادة لتبدأ خطة المذاكرة المتكاملة.</p>
              <button className="study-button" onClick={() => setShowSubjectForm(true)}>
                إضافة مادة جديدة
              </button>
            </div>
          )}
          {subjectsActive.map((subject) => {
            const lectures = getSubjectLectures(state, subject.id);
            const { done, total, remaining } = getSubjectProgress(lectures);
            const remainingMinutes = lectures
              .filter((lecture) => lecture.status !== 'done')
              .reduce((sum, lecture) => sum + lecture.estimatedMinutes, 0);
            const daysLeft = dayjs(subject.examDate).startOf('day').diff(dayjs().startOf('day'), 'day');
            const todayTargets = state.studyDays
              .find((day) => day.date === dayjs().format('YYYY-MM-DD'))
              ?.targetLectures.filter((lecture) => lecture.subjectId === subject.id).length ?? 0;
            const effectiveDays = Math.max(0, daysLeft - subject.reservedRevisionDays);
            const requiredPerDay = effectiveDays > 0 ? remaining / effectiveDays : remaining;
            const requiredMinutesPerDay =
              effectiveDays > 0 ? remainingMinutes / effectiveDays : remainingMinutes;
            const lecturesCap = state.settings.maxLecturesPerDay ?? Number.POSITIVE_INFINITY;
            const minutesCap = state.settings.maxMinutesPerDay ?? Number.POSITIVE_INFINITY;
            const atRisk =
              remaining > 0 && (effectiveDays <= 0 || requiredPerDay > lecturesCap || requiredMinutesPerDay > minutesCap);
            return (
              <button
                key={subject.id}
                className="subject-card"
                onClick={() => onNavigate({ type: 'subject', subjectId: subject.id })}
              >
                <div className="subject-card__header">
                  <h3>{subject.name}</h3>
                  <span className="subject-color" style={{ background: subject.color }} />
                </div>
                <p className="subject-card__exam">موعد الاختبار · {dayjs(subject.examDate).format('YYYY/MM/DD')}</p>
                <div className="subject-card__progress">
                  <div className="progress-bar">
                    <div
                      className="progress-bar__fill"
                      style={{
                        width: `${total ? Math.round((done / total) * 100) : 0}%`,
                        background: subject.color,
                      }}
                    />
                  </div>
                  <span>
                    {done}/{total} مكتمل
                  </span>
                </div>
                <div className="subject-card__meta">
                  <span>{remaining} متبقية</span>
                  <span>خطة اليوم: {todayTargets}</span>
                </div>
                <div className="subject-card__footer">
                  <span>الصعوبة: {difficultyLabel[subject.difficulty]}</span>
                  <span>أيام المراجعة: {subject.reservedRevisionDays}</span>
                </div>
                {atRisk && <span className="badge badge-warning">خطر التراكم</span>}
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
                <p>{dayjs(selectedDate).format('YYYY/MM/DD')}</p>
              </div>
              <div className="day-details__meta">
                <span className={clsx('badge', selectedDay?.isRestDay && 'badge-warning')}>
                  {selectedDay?.isRestDay ? 'يوم راحة' : 'يوم تركيز'}
                </span>
                <span className="badge">
                  {selectedDay
                    ? `${selectedDay.completedLectures.length}/${selectedDay.targetLectures.length} محاضرة`
                    : '0/0 محاضرة'}
                </span>
              </div>
            </div>
            <div className="day-blocks">
              {['morning', 'afternoon', 'evening'].map((block) => {
                const tasks = selectedDay?.targetLectures.filter((item) => (item.block ?? 'morning') === block) ?? [];
                return (
                  <div key={block} className="day-block">
                    <h3>{blockLabels[block] ?? block}</h3>
                    {tasks.length === 0 && <p className="muted">لا توجد مهام مخططة.</p>}
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
                            <strong>{lecture?.title ?? 'محاضرة'}</strong>
                            <p>{subject?.name ?? ''}</p>
                          </div>
                          <span className="muted">{lecture?.estimatedMinutes ?? 45} دقيقة</span>
                        </label>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            <div className="day-progress">
              <div>
                <h3>ملخص اليوم</h3>
                <p>
                  {selectedDay
                    ? `${selectedDay.completedLectures.length} / ${selectedDay.targetLectures.length} محاضرة · ${selectedDay.completedMinutes} / ${selectedDay.targetMinutes ?? 0} دقيقة`
                    : 'لا توجد خطة بعد. أضف مهامًا للبدء.'}
                </p>
              </div>
              <button
                className="study-button secondary"
                onClick={() => actions.setRestDay(selectedDate, !(selectedDay?.isRestDay ?? false))}
              >
                {selectedDay?.isRestDay ? 'تعيين اليوم كيوم عمل' : 'تعيين اليوم كيوم راحة'}
              </button>
            </div>
            <div className="day-wellbeing">
              <h3>مزاج وطاقة اليوم</h3>
              <div className="plan-grid">
                <label>
                  المزاج (1-5)
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={selectedMeta?.mood ?? ''}
                    onChange={(event) => {
                      const raw = event.target.value;
                      if (raw === '') {
                        handleMoodChange('mood', undefined);
                        return;
                      }
                      const numeric = Number(raw);
                      if (Number.isNaN(numeric)) {
                        handleMoodChange('mood', undefined);
                        return;
                      }
                      handleMoodChange('mood', Math.min(5, Math.max(1, numeric)));
                    }}
                  />
                </label>
                <label>
                  الطاقة (1-5)
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={selectedMeta?.energy ?? ''}
                    onChange={(event) => {
                      const raw = event.target.value;
                      if (raw === '') {
                        handleMoodChange('energy', undefined);
                        return;
                      }
                      const numeric = Number(raw);
                      if (Number.isNaN(numeric)) {
                        handleMoodChange('energy', undefined);
                        return;
                      }
                      handleMoodChange('energy', Math.min(5, Math.max(1, numeric)));
                    }}
                  />
                </label>
              </div>
            </div>
            <div className="day-manual">
              <h3>تسجيل دقائق دراسة سريعة</h3>
              <div className="plan-grid">
                <label>
                  المادة
                  <select value={quickSubject} onChange={(event) => setQuickSubject(event.target.value)}>
                    {state.subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  الدقائق
                  <input
                    type="number"
                    min={5}
                    value={quickMinutes}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      setQuickMinutes(Number.isNaN(next) ? 0 : next);
                    }}
                  />
                </label>
                <button className="study-button" type="button" onClick={handleQuickSession}>
                  حفظ الجلسة
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="stats-preview">
        <div>
          <h3>أداء هذا الأسبوع</h3>
          <p>{weekStats.totalMinutes} دقيقة · {weekStats.lecturesCompleted} محاضرة</p>
        </div>
        <div>
          <h3>أكثر مادة تمت دراستها</h3>
          <p>
            {weekStats.mostStudiedSubjectId
              ? state.subjects.find((item) => item.id === weekStats.mostStudiedSubjectId)?.name ?? '—'
              : '—'}
            {weekStats.mostStudiedCount ? ` · ${weekStats.mostStudiedCount} محاضرة` : ''}
          </p>
        </div>
        <div>
          <h3>الالتزام بالخطة</h3>
          <p>{weekStats.adherence}%</p>
        </div>
        <div>
          <h3>سلسلة الأيام الناجحة</h3>
          <p>{weekStats.streak} يوم</p>
        </div>
      </section>

      {subjectsActive.length > 0 && (
        <button className="fab" onClick={() => setShowLectureForm(true)}>
          + إضافة محاضرة
        </button>
      )}

      <SubjectFormModal
        isOpen={showSubjectForm}
        onClose={() => setShowSubjectForm(false)}
        onSubmit={(values) =>
          handleCreateSubject({
            name: values.name,
            color: values.color,
            examDate: values.examDate,
            difficulty: values.difficulty,
            reservedRevisionDays: values.reservedRevisionDays,
            weight: values.weight,
            notes: values.notes,
          })
        }
      />

      <LectureFormModal
        isOpen={showLectureForm}
        onClose={() => setShowLectureForm(false)}
        onSubmit={handleCreateLecture}
        subjectOptions={subjectsActive.map((subject) => ({ id: subject.id, name: subject.name }))}
        allowPlanning
        defaultPlanDate={selectedDate}
        defaultSubjectId={subjectsActive[0]?.id}
      />
    </div>
  );
};
