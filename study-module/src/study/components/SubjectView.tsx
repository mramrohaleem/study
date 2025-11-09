import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import clsx from 'clsx';
import { SectionView } from '../StudySection';
import { useStudyActions, useStudyState } from '../state';
import { getSubjectLectures, getSubjectProgress } from '../utils/selectors';
import { Lecture, LectureStatus, LectureType } from '../types';

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
  lecture: 'Lecture',
  section: 'Section',
  mcq: 'MCQ',
  case: 'Case',
  other: 'Other',
};

export const SubjectView: React.FC<SubjectViewProps> = ({ subjectId, onNavigate }) => {
  const state = useStudyState();
  const actions = useStudyActions();
  const [filter, setFilter] = useState<LectureFilter>('all');
  const [sort, setSort] = useState<SortOption>('order');
  const [search, setSearch] = useState('');
  const [plannerInfo, setPlannerInfo] = useState<string | null>(null);
  const [plannerWarning, setPlannerWarning] = useState<string | null>(null);

  const subject = state.subjects.find((item) => item.id === subjectId);
  const lectures = useMemo(() => getSubjectLectures(state, subjectId), [state, subjectId]);
  const progress = useMemo(() => getSubjectProgress(lectures), [lectures]);

  if (!subject) {
    return (
      <div className="subject-view">
        <button className="study-button secondary" onClick={() => onNavigate({ type: 'dashboard' })}>
          Back to dashboard
        </button>
        <p>Subject not found.</p>
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

  const handlePlanner = () => {
    const result = actions.generatePlanForSubject(subjectId);
    if (!result) return;
    setPlannerInfo(
      `Scheduled ${result.change.newAverage.toFixed(1)} lectures/day until ${dayjs(subject.examDate)
        .subtract(subject.reservedRevisionDays, 'day')
        .format('DD MMM')}.`,
    );
    setPlannerWarning(result.warnings[0] ?? (result.change.overloaded ? 'Plan exceeds daily limits. Consider adjusting settings.' : null));
  };

  const todayTargets = state.studyDays
    .find((day) => day.date === dayjs().format('YYYY-MM-DD'))
    ?.targetLectures.filter((item) => item.subjectId === subjectId).length ?? 0;

  const requiredPerDay = progress.remaining
    ? progress.remaining / Math.max(1, daysLeft - subject.reservedRevisionDays)
    : 0;
  const overloaded =
    requiredPerDay > (state.settings.maxLecturesPerDay ?? Number.POSITIVE_INFINITY) ||
    (subject.reservedRevisionDays >= daysLeft && progress.remaining > 0);

  return (
    <div className="subject-view">
      <button className="link-button" onClick={() => onNavigate({ type: 'dashboard' })}>
        ← Back to dashboard
      </button>
      <header className="subject-header" style={{ borderColor: subject.color }}>
        <div>
          <h1>{subject.name}</h1>
          <p className="muted">Exam on {dayjs(subject.examDate).format('DD MMM YYYY')} · {daysLeft} days left</p>
        </div>
        <div className="subject-header__meta">
          <span className="badge">Difficulty: {subject.difficulty}</span>
          <span className="badge">Weight: {subject.weight}</span>
          <span className="badge">Reserved revision: {subject.reservedRevisionDays} days</span>
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
                strokeDashoffset={`${2 * Math.PI * 52 * (1 - progress.total ? 0 : progress.done / Math.max(progress.total, 1))}`}
                strokeLinecap="round"
                transform="rotate(-90 60 60)"
              />
            </svg>
            <strong>{progress.total ? Math.round((progress.done / progress.total) * 100) : 0}%</strong>
          </div>
          <div>
            <h3>{progress.done}/{progress.total} lectures complete</h3>
            <p>{progress.remaining} remaining · {progress.needsRevision} need revision</p>
            <p>Today’s targets: {todayTargets}</p>
          </div>
        </div>
        <div className="subject-progress__meta">
          <div>
            <span className="muted">Required per study day</span>
            <h4>{requiredPerDay.toFixed(1)} lectures</h4>
          </div>
          <div>
            <span className="muted">Difficulty insight</span>
            <p>Harder subjects may get more slots when auto-planning.</p>
          </div>
          {overloaded && <span className="badge badge-warning">At risk · adjust plan</span>}
        </div>
        <button className="study-button" onClick={handlePlanner}>
          Generate plan
        </button>
        {plannerInfo && <p className="planner-info">{plannerInfo}</p>}
        {plannerWarning && <p className="planner-warning">{plannerWarning}</p>}
      </section>

      <section className="subject-controls">
        <div className="filters">
          {(['all', 'remaining', 'needs_revision', 'done'] as LectureFilter[]).map((value) => (
            <button key={value} className={clsx('chip', filter === value && 'chip-active')} onClick={() => setFilter(value)}>
              {value.replace('_', ' ')}
            </button>
          ))}
        </div>
        <div className="controls-right">
          <input
            type="search"
            placeholder="Search lectures or tags"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select value={sort} onChange={(event) => setSort(event.target.value as SortOption)}>
            <option value="order">Order</option>
            <option value="status">Status</option>
            <option value="type">Type</option>
            <option value="minutes">Minutes</option>
          </select>
        </div>
      </section>

      <section className="lecture-list">
        {filteredLectures.length === 0 && (
          <div className="empty-state">
            <h3>No lectures found</h3>
            <p>Add lectures to this subject so we can build a plan.</p>
            <button
              className="study-button"
              onClick={() =>
                actions.upsertLecture({ subjectId, title: `Lecture ${lectures.length + 1}`, estimatedMinutes: 45 })
              }
            >
              Add lecture
            </button>
          </div>
        )}
        {filteredLectures.map((lecture) => (
          <article key={lecture.id} className={clsx('lecture-card', `status-${lecture.status}`)}>
            <div>
              <h3>{lecture.title}</h3>
              <p className="muted">{lectureTypeLabel[lecture.type]} · {lecture.estimatedMinutes} minutes</p>
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
                {lecture.status.replace('_', ' ')}
              </span>
              <div className="lecture-buttons">
                <button className="study-button secondary" onClick={() => onNavigate({ type: 'lecture', lectureId: lecture.id })}>
                  View
                </button>
                <button className="study-button" onClick={() => onNavigate({ type: 'focus', lectureId: lecture.id })}>
                  Focus
                </button>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
};
