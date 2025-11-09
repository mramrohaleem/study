import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import clsx from 'clsx';
import { SectionView } from '../StudySection';
import { useStudyActions, useStudyState } from '../state';
import { getSubjectLectures, getSubjectProgress, getLectureStatusLabel } from '../utils/selectors';
import { Difficulty, Lecture, LectureType } from '../types';
import { SubjectFormModal } from './SubjectFormModal';
import { LectureFormModal } from './LectureFormModal';

interface SubjectViewProps {
  subjectId: string;
  onNavigate: (view: SectionView) => void;
}

type LectureFilter = 'all' | 'remaining' | 'needs_revision' | 'done';
type SortOption = 'order' | 'status' | 'type' | 'minutes';

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

const lectureTypeLabel: Record<LectureType, string> = {
  lecture: 'محاضرة',
  section: 'قسم عملي',
  mcq: 'أسئلة اختيار من متعدد',
  case: 'حالة سريرية',
  other: 'أخرى',
};

const filterLabels: Record<LectureFilter, string> = {
  all: 'الكل',
  remaining: 'المتبقية',
  needs_revision: 'بحاجة لمراجعة',
  done: 'مكتملة',
};

const sortLabels: Record<SortOption, string> = {
  order: 'الترتيب',
  status: 'الحالة',
  type: 'النوع',
  minutes: 'الدقائق',
};

const difficultyLabel: Record<Difficulty, string> = {
  easy: 'سهل',
  medium: 'متوسط',
  hard: 'صعب',
};

export const SubjectView: React.FC<SubjectViewProps> = ({ subjectId, onNavigate }) => {
  const state = useStudyState();
  const actions = useStudyActions();
  const [filter, setFilter] = useState<LectureFilter>('all');
  const [sort, setSort] = useState<SortOption>('order');
  const [search, setSearch] = useState('');
  const [plannerInfo, setPlannerInfo] = useState<string | null>(null);
  const [plannerWarning, setPlannerWarning] = useState<string | null>(null);
  const [subjectFormOpen, setSubjectFormOpen] = useState(false);
  const [lectureFormOpen, setLectureFormOpen] = useState(false);
  const [editingLecture, setEditingLecture] = useState<Lecture | undefined>(undefined);

  const subject = state.subjects.find((item) => item.id === subjectId);
  const lectures = useMemo(() => getSubjectLectures(state, subjectId), [state, subjectId]);
  const progress = useMemo(() => getSubjectProgress(lectures), [lectures]);

  if (!subject) {
    return (
      <div className="subject-view">
        <button className="study-button secondary" onClick={() => onNavigate({ type: 'dashboard' })}>
          العودة إلى اللوحة
        </button>
        <p>لم يتم العثور على هذه المادة.</p>
      </div>
    );
  }

  const filteredLectures = sortLectures(
    lectures
      .filter((lecture) => filterLecture(lecture, filter))
      .filter((lecture) => {
        if (!search.trim()) return true;
        const term = search.toLowerCase();
        const matchTitle = lecture.title.toLowerCase().includes(term);
        const matchTags = lecture.tags.some((tag) => tag.toLowerCase().includes(term));
        return matchTitle || matchTags;
      }),
    sort,
  );

  const daysLeft = dayjs(subject.examDate).startOf('day').diff(dayjs().startOf('day'), 'day');
  const todayTargets = state.studyDays
    .find((day) => day.date === dayjs().format('YYYY-MM-DD'))
    ?.targetLectures.filter((item) => item.subjectId === subjectId).length ?? 0;
  const effectiveDays = Math.max(0, daysLeft - subject.reservedRevisionDays);
  const lecturesCap = state.settings.maxLecturesPerDay ?? Number.POSITIVE_INFINITY;
  const minutesCap = state.settings.maxMinutesPerDay ?? Number.POSITIVE_INFINITY;
  const remainingMinutes = lectures
    .filter((lecture) => lecture.status !== 'done')
    .reduce((total, lecture) => total + lecture.estimatedMinutes, 0);
  const requiredPerDay = progress.remaining ? progress.remaining / Math.max(1, effectiveDays) : 0;
  const requiredMinutesPerDay = remainingMinutes / Math.max(1, effectiveDays);
  const overloaded =
    progress.remaining > 0 &&
    (effectiveDays <= 0 || requiredPerDay > lecturesCap || requiredMinutesPerDay > minutesCap);

  const handlePlanner = () => {
    const result = actions.generatePlanForSubject(subjectId);
    if (!result) return;
    setPlannerInfo(
      `تم توزيع ${result.change.newAverage.toFixed(1)} محاضرة/يوم حتى ${dayjs(subject.examDate)
        .subtract(subject.reservedRevisionDays, 'day')
        .format('YYYY/MM/DD')}.`,
    );
    const warning =
      result.warnings[0] ??
      (result.change.overloaded
        ? 'الخطة الحالية تتجاوز الحدود اليومية. عدل الإعدادات أو عدد الأيام المتاحة.'
        : null);
    setPlannerWarning(warning);
  };

  const openLectureForm = (lecture?: Lecture) => {
    setEditingLecture(lecture);
    setLectureFormOpen(true);
  };

  return (
    <div className="subject-view">
      <button className="link-button" onClick={() => onNavigate({ type: 'dashboard' })}>
        ← العودة إلى اللوحة الرئيسية
      </button>
      <header className="subject-header" style={{ borderColor: subject.color }}>
        <div>
          <h1>{subject.name}</h1>
          <p className="muted">
            موعد الاختبار {dayjs(subject.examDate).format('YYYY/MM/DD')} · {daysLeft} يوم متبقي
          </p>
          {subject.notes && <p className="subject-notes">ملاحظات: {subject.notes}</p>}
        </div>
        <div className="subject-header__actions">
          <button className="study-button secondary" onClick={() => setSubjectFormOpen(true)}>
            تعديل المادة
          </button>
          <button className="study-button" onClick={() => openLectureForm()}>
            إضافة محاضرة
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
                  2 * Math.PI * 52 * (1 - (progress.total ? progress.done / Math.max(progress.total, 1) : 0))
                }`}
                strokeLinecap="round"
                transform="rotate(-90 60 60)"
              />
            </svg>
            <strong>{progress.total ? Math.round((progress.done / progress.total) * 100) : 0}%</strong>
          </div>
          <div>
            <h3>
              {progress.done}/{progress.total} محاضرة مكتملة
            </h3>
            <p>
              {progress.remaining} متبقية · {progress.needsRevision} بحاجة لمراجعة
            </p>
            <p>أهداف اليوم: {todayTargets}</p>
          </div>
        </div>
        <div className="subject-progress__meta">
          <div>
            <span className="muted">المعدل المطلوب لكل يوم دراسة</span>
            <h4>{requiredPerDay.toFixed(1)} محاضرة</h4>
          </div>
          <div>
            <span className="muted">الدقائق التقديرية يوميًا</span>
            <p>{Math.ceil(requiredMinutesPerDay)} دقيقة</p>
          </div>
          <div>
            <span className="muted">مستوى الصعوبة</span>
            <p>المستوى: {difficultyLabel[subject.difficulty]} · الوزن: {subject.weight}</p>
          </div>
          {overloaded && <span className="badge badge-warning">خطر تراكم · راجع الخطة</span>}
        </div>
        <button className="study-button" onClick={handlePlanner}>
          إعادة توزيع الخطة
        </button>
        {plannerInfo && <p className="planner-info">{plannerInfo}</p>}
        {plannerWarning && <p className="planner-warning">{plannerWarning}</p>}
      </section>

      <section className="subject-controls">
        <div className="filters">
          {(Object.keys(filterLabels) as LectureFilter[]).map((value) => (
            <button key={value} className={clsx('chip', filter === value && 'chip-active')} onClick={() => setFilter(value)}>
              {filterLabels[value]}
            </button>
          ))}
        </div>
        <div className="controls-right">
          <input
            type="search"
            placeholder="ابحث في عناوين المحاضرات أو الوسوم"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select value={sort} onChange={(event) => setSort(event.target.value as SortOption)}>
            {(Object.keys(sortLabels) as SortOption[]).map((option) => (
              <option key={option} value={option}>
                {sortLabels[option]}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="lecture-list">
        {filteredLectures.length === 0 && (
          <div className="empty-state">
            <h3>لا توجد محاضرات مطابقة</h3>
            <p>أضف محاضرات جديدة أو عدل عوامل التصفية.</p>
            <button className="study-button" onClick={() => openLectureForm()}>
              إضافة محاضرة
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
            </div>
            <div className="lecture-card__actions">
              <span className={clsx('badge', lecture.status === 'done' && 'badge-success', lecture.status === 'needs_revision' && 'badge-warning')}>
                {getLectureStatusLabel(lecture.status)}
              </span>
              <div className="lecture-buttons">
                <button className="study-button secondary" onClick={() => onNavigate({ type: 'lecture', lectureId: lecture.id })}>
                  تفاصيل
                </button>
                <button className="study-button secondary" onClick={() => openLectureForm(lecture)}>
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

      <SubjectFormModal
        isOpen={subjectFormOpen}
        onClose={() => setSubjectFormOpen(false)}
        initialSubject={subject}
        onSubmit={(values) =>
          actions.updateSubject(subjectId, {
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
        isOpen={lectureFormOpen}
        onClose={() => {
          setLectureFormOpen(false);
          setEditingLecture(undefined);
        }}
        subjectOptions={[{ id: subject.id, name: subject.name }]}
        defaultSubjectId={subject.id}
        lockSubject
        initialLecture={editingLecture}
        onSubmit={(values) => {
          if (editingLecture) {
            actions.updateLecture(editingLecture.id, {
              title: values.title,
              type: values.type,
              estimatedMinutes: values.estimatedMinutes,
              priority: values.priority,
              tags: values.tags,
              sourceLink: values.sourceLink,
            });
            setEditingLecture(undefined);
            setLectureFormOpen(false);
            return editingLecture.id;
          }
          const lectureId = actions.upsertLecture({
            subjectId: subject.id,
            title: values.title,
            type: values.type,
            estimatedMinutes: values.estimatedMinutes,
            priority: values.priority,
            tags: values.tags,
            sourceLink: values.sourceLink,
          });
          setLectureFormOpen(false);
          return lectureId;
        }}
      />
    </div>
  );
};
