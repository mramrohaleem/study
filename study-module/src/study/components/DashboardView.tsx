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
import { Difficulty, PlannedLecture } from '../types';
import { SubjectForm, SubjectFormValues } from './SubjectForm';

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
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [quickForm, setQuickForm] = useState({
    subjectId: '',
    title: '',
    minutes: 45,
    block: 'morning',
  });

  const nextExam = useMemo(() => getNextExamSubject(state.subjects), [state.subjects]);
  const todayPlan = useMemo(
    () => state.studyDays.find((day) => day.date === dayjs().format('YYYY-MM-DD')),
    [state.studyDays],
  );
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
  const selectedMeta = state.dayMeta.find((meta) => meta.date === selectedDate);
  const difficultyLabel: Record<Difficulty, string> = {
    easy: 'سهل',
    medium: 'متوسط',
    hard: 'صعب',
  };

  const handleQuickSubmit = () => {
    if (!quickForm.subjectId) return;
    if (quickMode === 'lecture') {
      const lectureId = actions.upsertLecture({
        subjectId: quickForm.subjectId,
        title: quickForm.title || 'محاضرة بدون عنوان',
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

  const handleCreateSubject = (values: SubjectFormValues) => {
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

  const miniCalendar = useMemo(() => {
    const start = dayjs(selectedDate).subtract(3, 'day');
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
  }, [state.studyDays, selectedDate]);

  return (
    <div className="study-dashboard">
      <header className="study-dashboard__header">
        <div>
          <h1>مساحة المذاكرة</h1>
          <p className="study-dashboard__subtitle">كل ما تحتاجه لتنظيم محاضراتك واستعدادك للامتحانات.</p>
        </div>
        <div className="header-actions">
          <button className="study-button secondary" onClick={() => onNavigate({ type: 'settings' })}>
            الإعدادات
          </button>
          <button className="study-button secondary" onClick={() => onNavigate({ type: 'stats' })}>
            الإحصاءات والمسار
          </button>
        </div>
      </header>

      <section className="summary-grid">
        <div className="summary-card">
          <span className="summary-label">أقرب اختبار</span>
          <h3>{nextExam ? nextExam.name : 'لا توجد اختبارات قادمة'}</h3>
          <p>{nextExam ? dayjs(nextExam.examDate).format('DD MMM YYYY') : 'أضف مادة لبدء التخطيط.'}</p>
        </div>
        <div className="summary-card">
          <span className="summary-label">الأيام المتبقية</span>
          <h3>{daysUntilExam}</h3>
          <p>حافظ على الاستمرارية وسنساعدك في التعديل تلقائياً.</p>
        </div>
        <div className="summary-card">
          <span className="summary-label">محاضرات متبقية</span>
          <h3>{totalRemainingLectures}</h3>
          <p>إجمالي الدروس لكل المواد النشطة.</p>
        </div>
        <div className="summary-card">
          <span className="summary-label">تقدم اليوم</span>
          <h3>{todayPlan ? `${todayPlan.completedLectures.length} / ${todayPlan.targetLectures.length}` : '0 / 0'} محاضرة</h3>
          <p>{todayPlan ? `${todayPlan.completedMinutes} / ${todayPlan.targetMinutes ?? 0} دقيقة` : 'ابدأ بتسجيل جلسة.'}</p>
        </div>
      </section>

      <section className="next-up-card">
        <div>
          <h2>التالي في الخطة</h2>
          {nextUp ? (
            <p>
              {(() => {
                const lecture = state.lectures.find((item) => item.id === nextUp.lectureId);
                const subject = state.subjects.find((item) => item.id === nextUp.subjectId);
                if (!lecture || !subject) return 'لا مهام حالياً';
                return `${subject.name} · ${lecture.title}`;
              })()}
            </p>
          ) : (
            <p>أنجزت مهام اليوم! استمتع بوقتك.</p>
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
              <p>أضف أول مادة لتبدأ بتنظيم خطة المذاكرة.</p>
              <button className="study-button" onClick={() => setShowSubjectForm(true)}>
                إضافة مادة
              </button>
            </div>
          )}
          {subjectsActive.map((subject) => {
            const lectures = getSubjectLectures(state, subject.id);
            const { done, total, remaining } = getSubjectProgress(lectures);
            const daysLeft = dayjs(subject.examDate).startOf('day').diff(dayjs().startOf('day'), 'day');
            const todayTargets =
              state.studyDays
                .find((day) => day.date === dayjs().format('YYYY-MM-DD'))
                ?.targetLectures.filter((lecture) => lecture.subjectId === subject.id).length ?? 0;
            const effectiveStudyDays = Math.max(0, daysLeft - subject.reservedRevisionDays);
            const requiredPerDay = effectiveStudyDays > 0 ? remaining / effectiveStudyDays : remaining;
            const atRisk =
              remaining > 0 &&
              (effectiveStudyDays <= 0 ||
                requiredPerDay > (state.settings.maxLecturesPerDay ?? Math.max(requiredPerDay, 1)));
            return (
              <button key={subject.id} className="subject-card" onClick={() => onNavigate({ type: 'subject', subjectId: subject.id })}>
                <div className="subject-card__header">
                  <span className="subject-color" style={{ background: subject.color }} />
                  <h3>{subject.name}</h3>
                </div>
                <p className="subject-card__exam">الامتحان · {dayjs(subject.examDate).format('DD MMM')}</p>
                <div className="subject-card__progress">
                  <div className="progress-bar">
                    <div
                      className="progress-bar__fill"
                      style={{ width: `${total ? Math.round((done / total) * 100) : 0}%`, background: subject.color }}
                    />
                  </div>
                  <span>
                    {done}/{total} منجز
                  </span>
                </div>
                <div className="subject-card__meta">
                  <span>{remaining} متبقي</span>
                  <span>اليوم: {todayTargets}</span>
                </div>
                <div className="subject-card__footer">
                  <span>الصعوبة: {difficultyLabel[subject.difficulty]}</span>
                  <span>أيام المراجعة: {subject.reservedRevisionDays}</span>
                </div>
                {atRisk && <span className="badge badge-warning">خطر · راجع الخطة</span>}
              </button>
            );
          })}
          <button className="add-subject-card" onClick={() => setShowSubjectForm(true)}>
            + إضافة مادة جديدة
          </button>
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
                  {selectedDay?.isRestDay ? 'يوم راحة / خفيف' : 'يوم تركيز'}
                </span>
                <span className="badge">
                  {selectedDay
                    ? `${selectedDay.completedLectures.length}/${selectedDay.targetLectures.length} محاضرة`
                    : '0/0 محاضرة'}
                </span>
              </div>
            </div>
            <div className="day-meta">
              <label>
                المزاج (1-5)
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={selectedMeta?.mood ?? ''}
                  onChange={(event) =>
                    actions.updateDayMeta(selectedDate, {
                      mood: event.target.value ? Number(event.target.value) : undefined,
                    })
                  }
                  placeholder="--"
                />
              </label>
              <label>
                الطاقة (1-5)
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={selectedMeta?.energy ?? ''}
                  onChange={(event) =>
                    actions.updateDayMeta(selectedDate, {
                      energy: event.target.value ? Number(event.target.value) : undefined,
                    })
                  }
                  placeholder="--"
                />
              </label>
            </div>
            <div className="day-blocks">
              {['morning', 'afternoon', 'evening'].map((block) => {
                const tasks = selectedDay?.targetLectures.filter((item) => (item.block ?? 'morning') === block) ?? [];
                const blockLabel =
                  block === 'morning' ? 'الصباح' : block === 'afternoon' ? 'بعد الظهر' : 'المساء';
                return (
                  <div key={block} className="day-block">
                    <h3>{blockLabel}</h3>
                    {tasks.length === 0 && <p className="muted">لا توجد مهام مخطط لها.</p>}
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
                            <strong>{lecture?.title ?? 'درس'}</strong>
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
              <h3>ملخص اليوم</h3>
              <p>
                {selectedDay
                  ? `${selectedDay.completedLectures.length} / ${selectedDay.targetLectures.length} محاضرة · ${selectedDay.completedMinutes} / ${selectedDay.targetMinutes ?? 0} دقيقة`
                  : 'لا يوجد تخطيط لهذا اليوم بعد.'}
              </p>
              <button
                className="study-button secondary"
                onClick={() => actions.setRestDay(selectedDate, !(selectedDay?.isRestDay ?? false))}
              >
                {selectedDay?.isRestDay ? 'تعيين كيوم تركيز' : 'تعيين كيوم راحة'}
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="stats-preview">
        <div>
          <h3>هذا الأسبوع</h3>
          <p>{weekStats.totalMinutes} دقيقة · {weekStats.lecturesCompleted} محاضرة</p>
        </div>
        <div>
          <h3>الأكثر دراسة</h3>
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
          <h3>سلسلة الإنجاز</h3>
          <p>{weekStats.streak} يوم</p>
        </div>
      </section>

      <button className="fab" onClick={() => setShowQuickAction(true)}>
        + إجراء سريع
      </button>

      {showQuickAction && (
        <div className="quick-action">
          <div className="quick-action__header">
            <div className="quick-action__toggle">
              <button className={clsx(quickMode === 'lecture' && 'active')} onClick={() => setQuickMode('lecture')}>
                إضافة درس
              </button>
              <button className={clsx(quickMode === 'session' && 'active')} onClick={() => setQuickMode('session')}>
                تسجيل جلسة
              </button>
            </div>
            <button className="icon-button" onClick={() => setShowQuickAction(false)} aria-label="إغلاق">
              ×
            </button>
          </div>
          <div className="quick-action__form">
            <label>
              المادة
              <select
                value={quickForm.subjectId}
                onChange={(event) => setQuickForm((prev) => ({ ...prev, subjectId: event.target.value }))}
              >
                <option value="">اختر مادة</option>
                {state.subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </label>
            {quickMode === 'lecture' && (
              <label>
                عنوان الدرس
                <input
                  type="text"
                  value={quickForm.title}
                  onChange={(event) => setQuickForm((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="مثال: فصل المناعة"
                />
              </label>
            )}
            <label>
              الدقائق
              <input
                type="number"
                min={5}
                value={quickForm.minutes}
                onChange={(event) => setQuickForm((prev) => ({ ...prev, minutes: Number(event.target.value) }))}
              />
            </label>
            {quickMode === 'lecture' && (
              <label>
                الفترة
                <select value={quickForm.block} onChange={(event) => setQuickForm((prev) => ({ ...prev, block: event.target.value }))}>
                  <option value="morning">الصباح</option>
                  <option value="afternoon">بعد الظهر</option>
                  <option value="evening">المساء</option>
                </select>
              </label>
            )}
            <div className="quick-action__footer">
              <button className="study-button" onClick={handleQuickSubmit}>
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}

      {showSubjectForm && (
        <SubjectForm
          title="إضافة مادة جديدة"
          onCancel={() => setShowSubjectForm(false)}
          onSubmit={handleCreateSubject}
          submitLabel="حفظ المادة"
        />
      )}
    </div>
  );
};
