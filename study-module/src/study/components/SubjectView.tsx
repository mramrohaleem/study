import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import clsx from 'clsx';
import { SectionView } from '../StudySection';
import { useStudyActions, useStudyState } from '../state';
import { getSubjectLectures, getSubjectProgress } from '../utils/selectors';
import { Difficulty, Lecture, LectureStatus, LectureType } from '../types';
import { SubjectForm } from './SubjectForm';
import { LectureForm, LectureFormValues } from './LectureForm';
import { BulkLectureForm } from './BulkLectureForm';

interface SubjectViewProps {
  subjectId: string;
  onNavigate: (view: SectionView) => void;
}

type LectureFilter = 'all' | 'remaining' | 'needs_revision' | 'done';
type SortOption = 'order' | 'status' | 'type' | 'minutes';

type LectureStatusLabel = Record<LectureStatus, string>;

type LectureTypeLabel = Record<LectureType, string>;

const filterLecture = (lecture: Lecture, filter: LectureFilter) => {
  switch (filter) {
    case 'remaining':
      return lecture.status === 'not_started' || lecture.status === 'in_progress';
    case 'needs_revision':
      return lecture.status === 'needs_revision';
    case 'done':
      return lecture.status === 'done';
    default:
      return true;
  }
};

const sortLectures = (lectures: Lecture[], option: SortOption) => {
  switch (option) {
    case 'status':
      return [...lectures].sort((a, b) => a.status.localeCompare(b.status));
    case 'type':
      return [...lectures].sort((a, b) => a.type.localeCompare(b.type));
    case 'minutes':
      return [...lectures].sort((a, b) => a.estimatedMinutes - b.estimatedMinutes);
    default:
      return [...lectures].sort((a, b) => a.order - b.order);
  }
};

const lectureTypeLabel: LectureTypeLabel = {
  lecture: 'محاضرة',
  section: 'سكشن',
  mcq: 'أسئلة اختيار من متعدد',
  case: 'حالة',
  other: 'أخرى',
};

const lectureStatusLabel: LectureStatusLabel = {
  not_started: 'لم تبدأ',
  in_progress: 'قيد الإنجاز',
  done: 'منتهية',
  needs_revision: 'تحتاج مراجعة',
};

const difficultyLabel: Record<Difficulty, string> = {
  easy: 'سهل',
  medium: 'متوسط',
  hard: 'صعب',
};

const getImportanceLabel = (weight: number): string => {
  if (weight <= 0.9) return 'أولوية منخفضة';
  if (weight >= 1.2) return 'أولوية مرتفعة';
  return 'أولوية عادية';
};

export const SubjectView: React.FC<SubjectViewProps> = ({ subjectId, onNavigate }) => {
  const state = useStudyState();
  const actions = useStudyActions();
  const [filter, setFilter] = useState<LectureFilter>('all');
  const [sort, setSort] = useState<SortOption>('order');
  const [search, setSearch] = useState('');
  const [plannerInfo, setPlannerInfo] = useState<string | null>(null);
  const [plannerWarning, setPlannerWarning] = useState<string | null>(null);
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [lectureToEdit, setLectureToEdit] = useState<Lecture | null>(null);
  const [showLectureForm, setShowLectureForm] = useState(false);
  const [showBulkForm, setShowBulkForm] = useState(false);

  const subject = state.subjects.find((item) => item.id === subjectId);
  const lectures = useMemo(() => getSubjectLectures(state, subjectId), [state, subjectId]);
  const progress = useMemo(() => getSubjectProgress(lectures), [lectures]);

  if (!subject) {
    return (
      <div className="subject-view">
        <button className="study-button secondary" onClick={() => onNavigate({ type: 'dashboard' })}>
          العودة إلى لوحة التحكم
        </button>
        <p>لم يتم العثور على المادة.</p>
      </div>
    );
  }

  const filteredLectures = sortLectures(
    lectures.filter((lecture) => filterLecture(lecture, filter)).filter((lecture) => {
      if (!search.trim()) return true;
      const matchTitle = lecture.title.toLowerCase().includes(search.toLowerCase());
      const matchTags = lecture.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()));
      return matchTitle || matchTags;
    }),
    sort,
  );

  const daysLeft = dayjs(subject.examDate).startOf('day').diff(dayjs().startOf('day'), 'day');
  const effectiveStudyDays = Math.max(0, daysLeft - subject.reservedRevisionDays);
  const requiredPerDay = progress.remaining
    ? progress.remaining / Math.max(1, effectiveStudyDays || 1)
    : 0;
  const overloaded =
    progress.remaining > 0 &&
    (effectiveStudyDays <= 0 ||
      requiredPerDay > (state.settings.maxLecturesPerDay ?? Math.max(requiredPerDay, 1)));

  const maxLecturesPerDay = state.settings.maxLecturesPerDay;
  const maxMinutesPerDay = state.settings.maxMinutesPerDay;

  const lectureMap = useMemo(() => {
    const map = new Map<string, Lecture>();
    for (const lecture of state.lectures) {
      map.set(lecture.id, lecture);
    }
    return map;
  }, [state.lectures]);

  const exceedsMinutesCap = useMemo(() => {
    if (maxMinutesPerDay == null) {
      return false;
    }

    for (const day of state.studyDays) {
      const subjectTargets = day.targetLectures.filter(
        (item) => item.subjectId === subjectId && !item.isRevision,
      );
      if (!subjectTargets.length) continue;

      let totalMinutes = 0;
      for (const planned of subjectTargets) {
        const lecture = lectureMap.get(planned.lectureId);
        totalMinutes += lecture?.estimatedMinutes ?? 30;
      }

      if (totalMinutes > maxMinutesPerDay) {
        return true;
      }
    }

    return false;
  }, [lectureMap, maxMinutesPerDay, state.studyDays, subjectId]);

  useEffect(() => {
    const noTimeWarning =
      'لا يوجد وقت كافٍ قبل بدء أيام المراجعة. قلل عدد الدروس أو عدّل أيام المراجعة أو تاريخ الامتحان.';
    const requiredPerDayValue = requiredPerDay.toFixed(1);
    const lecturesCapWarning =
      maxLecturesPerDay != null
        ? `الخطة الحالية تحتاج إلى ${requiredPerDayValue} درس في اليوم، وهذا أعلى من الحد الأقصى للمحاضرات اليومية في الإعدادات (${maxLecturesPerDay} درس).`
        : null;
    const minutesCapWarning =
      'مجموع الدقائق اليومية المطلوبة لهذه المادة يتجاوز الحد الأقصى المحدد في الإعدادات. جرّب تقليل الوقت التقديري لكل درس أو تعديل الحد الأقصى للدقائق.';
    const genericWarning =
      'الخطة الحالية قريبة من الحد الأقصى للحمل اليومي، راقب الضغط وعدّل التوزيع أو الإعدادات إذا لزم الأمر.';

    const autoMessages = [noTimeWarning, lecturesCapWarning, minutesCapWarning, genericWarning].filter(
      (message): message is string => Boolean(message),
    );

    if (!overloaded) {
      if (plannerWarning && autoMessages.includes(plannerWarning)) {
        setPlannerWarning(null);
      }
      return;
    }

    if (effectiveStudyDays <= 0 && progress.remaining > 0) {
      setPlannerWarning(noTimeWarning);
      return;
    }

    if (lecturesCapWarning && maxLecturesPerDay != null && requiredPerDay > maxLecturesPerDay) {
      setPlannerWarning(lecturesCapWarning);
      return;
    }

    if (exceedsMinutesCap) {
      setPlannerWarning(minutesCapWarning);
      return;
    }

    setPlannerWarning(genericWarning);
  }, [
    overloaded,
    effectiveStudyDays,
    progress.remaining,
    requiredPerDay,
    maxLecturesPerDay,
    exceedsMinutesCap,
    plannerWarning,
  ]);

  const handlePlanner = () => {
    const result = actions.generatePlanForSubject(subjectId);
    if (!result) return;
    const cutoff = dayjs(subject.examDate).subtract(subject.reservedRevisionDays, 'day');
    setPlannerInfo(
      `تم توزيع الدروس بمتوسط ${result.change.newAverage.toFixed(1)} يومياً حتى ${cutoff.format('DD MMM')}.`,
    );
    if (result.warnings.length) {
      setPlannerWarning(result.warnings[0]);
    } else if (result.change.overloaded) {
      setPlannerWarning('الخطة الحالية تتجاوز الحدود اليومية المسموح بها. راجع الإعدادات أو قلل عدد الدروس.');
    } else {
      setPlannerWarning(null);
    }
  };

  const todayTargets =
    state.studyDays
      .find((day) => day.date === dayjs().format('YYYY-MM-DD'))
      ?.targetLectures.filter((item) => item.subjectId === subjectId).length ?? 0;

  const handleAddLecture = (values: LectureFormValues) => {
    actions.upsertLecture({
      subjectId,
      title: values.title,
      estimatedMinutes: values.estimatedMinutes,
      type: values.type,
      priority: values.priority,
      tags: values.tags,
      sourceLink: values.sourceLink,
      order: lectures.length + 1,
    });
    setLectureToEdit(null);
    setShowLectureForm(false);
  };

  const handleUpdateLecture = (values: LectureFormValues) => {
    if (!lectureToEdit) return;
    actions.updateLecture(lectureToEdit.id, {
      title: values.title,
      estimatedMinutes: values.estimatedMinutes,
      type: values.type,
      priority: values.priority,
      tags: values.tags,
      sourceLink: values.sourceLink,
    });
    setShowLectureForm(false);
    setLectureToEdit(null);
  };

  const openLectureEdit = (lecture: Lecture) => {
    setLectureToEdit(lecture);
    setShowLectureForm(true);
  };

  return (
    <div className="subject-view">
      <button className="link-button" onClick={() => onNavigate({ type: 'dashboard' })}>
        ← العودة إلى لوحة التحكم
      </button>
      <header className="subject-header" style={{ borderColor: subject.color }}>
        <div>
          <h1>{subject.name}</h1>
          <p className="muted">
            الامتحان في {dayjs(subject.examDate).format('DD MMM YYYY')} · متبقٍ {Math.max(daysLeft, 0)} يوم
          </p>
          {subject.notes && <p className="subject-notes">ملاحظات: {subject.notes}</p>}
        </div>
        <div className="subject-header__meta">
          <span className="badge">الصعوبة: {difficultyLabel[subject.difficulty]}</span>
          <span className="badge">أولوية المادة: {getImportanceLabel(subject.weight)}</span>
          <span className="badge">أيام المراجعة: {subject.reservedRevisionDays}</span>
          <button className="study-button secondary" onClick={() => setShowSubjectForm(true)}>
            تعديل المادة
          </button>
        </div>
      </header>

      <section className="subject-progress">
        <div className="progress-large">
          <div className="progress-large__ring">
            <svg width="120" height="120">
              <circle cx="60" cy="60" r="52" stroke="#e2e8f0" strokeWidth="12" fill="none" />
              <circle
                cx="60"
                cy="60"
                r="52"
                stroke={subject.color}
                strokeWidth="12"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 52}`}
                strokeDashoffset={`${
                  2 * Math.PI * 52 * (progress.total ? 1 - progress.done / Math.max(progress.total, 1) : 1)
                }`}
                strokeLinecap="round"
                transform="rotate(-90 60 60)"
              />
            </svg>
            <strong>{progress.total ? Math.round((progress.done / progress.total) * 100) : 0}%</strong>
          </div>
          <div>
            <h3>
              {progress.done}/{progress.total} درس منجز
            </h3>
            <p>{progress.remaining} متبقٍ · {progress.needsRevision} يحتاج إلى مراجعة</p>
            <p>أهداف اليوم: {todayTargets}</p>
          </div>
        </div>
        <div className="subject-progress__meta">
          <div>
            <span className="muted">المطلوب لكل يوم دراسة</span>
            <h4>{requiredPerDay.toFixed(1)} درس</h4>
          </div>
          <div>
            <span className="muted">مؤشر الصعوبة</span>
            <p>المواد الأصعب تحصل على وزن أكبر عند إعادة التخطيط.</p>
          </div>
          {overloaded && <span className="badge badge-warning">الخطة معرضة للخطر</span>}
        </div>
        <div className="subject-progress__actions">
          <button className="study-button" onClick={handlePlanner}>
            إعادة توزيع الدروس
          </button>
          <button className="study-button secondary" onClick={() => onNavigate({ type: 'revisionPlanner', subjectId })}>
            مخطط المراجعة
          </button>
        </div>
        {plannerInfo && <p className="planner-info">{plannerInfo}</p>}
        {plannerWarning && <p className="planner-warning">{plannerWarning}</p>}
      </section>

      <section className="subject-controls">
        <div className="filters">
          {([
            ['all', 'الكل'],
            ['remaining', 'المتبقي'],
            ['needs_revision', 'يحتاج مراجعة'],
            ['done', 'منجز'],
          ] as [LectureFilter, string][]).map(([value, label]) => (
            <button key={value} className={clsx('chip', filter === value && 'chip-active')} onClick={() => setFilter(value)}>
              {label}
            </button>
          ))}
        </div>
        <div className="controls-right">
          <input
            type="search"
            placeholder="ابحث باسم الدرس أو الوسوم"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select value={sort} onChange={(event) => setSort(event.target.value as SortOption)}>
            <option value="order">الترتيب</option>
            <option value="status">الحالة</option>
            <option value="type">النوع</option>
            <option value="minutes">الوقت</option>
          </select>
          <button className="study-button" onClick={() => { setLectureToEdit(null); setShowLectureForm(true); }}>
            إضافة درس
          </button>
          <button
            className="study-button secondary"
            onClick={() => {
              setShowLectureForm(false);
              setShowBulkForm(true);
            }}
          >
            إضافة مجموعة دروس
          </button>
        </div>
      </section>

      <section className="lecture-list">
        {filteredLectures.length === 0 && (
          <div className="empty-state">
            <h3>لا توجد دروس</h3>
            <p>أضف دروساً لهذه المادة لنبني خطة مناسبة.</p>
            <button className="study-button" onClick={() => { setLectureToEdit(null); setShowLectureForm(true); }}>
              إضافة درس جديد
            </button>
          </div>
        )}
        {filteredLectures.map((lecture) => (
          <article key={lecture.id} className={clsx('lecture-card', `status-${lecture.status}`)}>
            <div>
              <h3>{lecture.title}</h3>
              <p className="muted">
                {lectureTypeLabel[lecture.type]} · {lecture.estimatedMinutes} دقيقة
              </p>
              {lecture.tags.length > 0 && (
                <div className="tag-row">
                  {lecture.tags.map((tag) => (
                    <span key={tag} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {lecture.sourceLink && (
                <a className="link-button" href={lecture.sourceLink} target="_blank" rel="noreferrer">
                  فتح المصدر
                </a>
              )}
            </div>
            <div className="lecture-card__actions">
              <span
                className={clsx(
                  'badge',
                  lecture.status === 'done' && 'badge-success',
                  lecture.status === 'needs_revision' && 'badge-warning',
                )}
              >
                {lectureStatusLabel[lecture.status]}
              </span>
              <div className="lecture-buttons">
                <button className="study-button secondary" onClick={() => onNavigate({ type: 'lecture', lectureId: lecture.id })}>
                  عرض التفاصيل
                </button>
                <button className="study-button secondary" onClick={() => openLectureEdit(lecture)}>
                  تعديل
                </button>
                <button className="study-button" onClick={() => onNavigate({ type: 'focus', lectureId: lecture.id })}>
                  تركيز
                </button>
              </div>
            </div>
          </article>
        ))}
      </section>

      {showSubjectForm && (
        <SubjectForm
          title="تعديل المادة"
          onCancel={() => setShowSubjectForm(false)}
          submitLabel="تحديث المادة"
          initial={{
            name: subject.name,
            color: subject.color,
            examDate: subject.examDate,
            difficulty: subject.difficulty,
            reservedRevisionDays: subject.reservedRevisionDays,
            weight: subject.weight,
            notes: subject.notes,
          }}
          onSubmit={(values) => {
            actions.updateSubject(subjectId, {
              name: values.name,
              color: values.color,
              examDate: values.examDate,
              difficulty: values.difficulty,
              reservedRevisionDays: values.reservedRevisionDays,
              weight: values.weight,
              notes: values.notes,
            });
            setShowSubjectForm(false);
          }}
        />
      )}

      {showLectureForm && (
        <LectureForm
          title={lectureToEdit ? 'تعديل الدرس' : 'إضافة درس جديد'}
          submitLabel={lectureToEdit ? 'حفظ التعديلات' : 'حفظ الدرس'}
          initial={
            lectureToEdit
              ? {
                  title: lectureToEdit.title,
                  estimatedMinutes: lectureToEdit.estimatedMinutes,
                  type: lectureToEdit.type,
                  priority: lectureToEdit.priority ?? 'normal',
                  tags: lectureToEdit.tags ?? [],
                  sourceLink: lectureToEdit.sourceLink,
                }
              : undefined
          }
          onCancel={() => {
            setShowLectureForm(false);
            setLectureToEdit(null);
          }}
          onSubmit={lectureToEdit ? handleUpdateLecture : handleAddLecture}
        />
      )}

      {showBulkForm && (
        <BulkLectureForm
          subjectId={subjectId}
          onCancel={() => setShowBulkForm(false)}
          onDone={() => setShowBulkForm(false)}
        />
      )}
    </div>
  );
};
