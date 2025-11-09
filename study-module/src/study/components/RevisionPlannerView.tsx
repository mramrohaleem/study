import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { SectionView } from '../StudySection';
import { useStudyActions, useStudyState } from '../state';
import { RevisionPass } from '../types';

interface RevisionPlannerViewProps {
  subjectId?: string;
  onNavigate: (view: SectionView) => void;
}

interface RevisionForm {
  name: string;
  trigger: 'after_finish' | 'before_exam';
  offsetDaysBeforeExam?: number;
  includeStatuses: ('done' | 'needs_revision')[];
  includeTags: string[];
  spreadOverDays?: number;
}

const defaultForm: RevisionForm = {
  name: 'Revision pass',
  trigger: 'after_finish',
  includeStatuses: ['done', 'needs_revision'],
  includeTags: [],
  spreadOverDays: 3,
};

export const RevisionPlannerView: React.FC<RevisionPlannerViewProps> = ({ subjectId, onNavigate }) => {
  const state = useStudyState();
  const actions = useStudyActions();
  const [selectedSubjectId, setSelectedSubjectId] = useState(subjectId ?? state.subjects[0]?.id ?? '');
  const [form, setForm] = useState<RevisionForm>(defaultForm);
  const [message, setMessage] = useState<string | null>(null);

  const subject = state.subjects.find((item) => item.id === selectedSubjectId);
  const revisionPasses = subject?.revisionPasses ?? [];

  const upcomingRevision = useMemo(() => {
    return state.studyDays
      .map((day) => ({
        date: day.date,
        items: day.targetLectures.filter((item) => item.isRevision && item.subjectId === selectedSubjectId),
      }))
      .filter((day) => day.items.length > 0)
      .slice(0, 7);
  }, [state.studyDays, selectedSubjectId]);

  const scheduleRevisionPass = (pass: RevisionPass) => {
    if (!subject) return;
    const lectures = state.lectures.filter((lecture) => lecture.subjectId === subject.id);
    const eligibleStatuses = pass.includeStatuses ?? ['needs_revision', 'done'];
    const filtered = lectures.filter((lecture) => {
      const matchesStatus = eligibleStatuses.includes(lecture.status as 'done' | 'needs_revision');
      const matchesTags = pass.includeTags && pass.includeTags.length > 0 ? pass.includeTags.some((tag) => lecture.tags.includes(tag)) : true;
      return matchesStatus && matchesTags;
    });
    if (!filtered.length) {
      setMessage('No lectures match this revision pass criteria yet.');
      return;
    }

    const startDate = pass.trigger === 'after_finish'
      ? dayjs().add(1, 'day')
      : dayjs(subject.examDate).subtract(pass.offsetDaysBeforeExam ?? 3, 'day');
    const spreadDays = pass.spreadOverDays ?? Math.min(filtered.length, 3);
    let cursor = startDate.startOf('day');

    filtered.forEach((lecture, index) => {
      const dayOffset = index % spreadDays;
      const targetDate = cursor.add(dayOffset, 'day').format('YYYY-MM-DD');
      const planned = {
        subjectId: subject.id,
        lectureId: lecture.id,
        block: `revision-${dayOffset + 1}`,
        isRevision: true,
      } as const;
      actions.assignLectureToDay(targetDate, planned, Math.max(lecture.estimatedMinutes / 2, 20));
    });
    setMessage(`Revision tasks scheduled across ${spreadDays} day(s) starting ${startDate.format('DD MMM')}.`);
  };

  const handleAddPass = () => {
    if (!selectedSubjectId) return;
    actions.addRevisionPass(selectedSubjectId, {
      name: form.name,
      trigger: form.trigger,
      offsetDaysBeforeExam: form.trigger === 'before_exam' ? form.offsetDaysBeforeExam ?? 7 : undefined,
      includeTags: form.includeTags,
      includeStatuses: form.includeStatuses,
      spreadOverDays: form.spreadOverDays,
    });
    setForm(defaultForm);
    setMessage('Revision pass saved.');
  };

  if (!subject) {
    return (
      <div className="revision-planner">
        <button className="link-button" onClick={() => onNavigate({ type: 'dashboard' })}>
          ← Back to dashboard
        </button>
        <p>Please add a subject first.</p>
      </div>
    );
  }

  return (
    <div className="revision-planner">
      <button className="link-button" onClick={() => onNavigate({ type: 'subject', subjectId: selectedSubjectId })}>
        ← Back to subject
      </button>
      <header className="revision-header">
        <div>
          <h1>Revision planner</h1>
          <p className="muted">Design revision passes and distribute tasks before the exam.</p>
        </div>
        <select value={selectedSubjectId} onChange={(event) => setSelectedSubjectId(event.target.value)}>
          {state.subjects.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </header>

      <section className="revision-form">
        <h3>Create a revision pass</h3>
        <div className="revision-grid">
          <label>
            Name
            <input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
          </label>
          <label>
            Trigger
            <select
              value={form.trigger}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, trigger: event.target.value as 'after_finish' | 'before_exam' }))
              }
            >
              <option value="after_finish">After finishing lectures</option>
              <option value="before_exam">Days before exam</option>
            </select>
          </label>
          {form.trigger === 'before_exam' && (
            <label>
              Days before exam
              <input
                type="number"
                min={1}
                value={form.offsetDaysBeforeExam ?? 7}
                onChange={(event) => setForm((prev) => ({ ...prev, offsetDaysBeforeExam: Number(event.target.value) }))}
              />
            </label>
          )}
          <label>
            Include statuses
            <select
              multiple
              value={form.includeStatuses}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  includeStatuses: Array.from(event.target.selectedOptions).map((option) => option.value as 'done' | 'needs_revision'),
                }))
              }
            >
              <option value="done">Done</option>
              <option value="needs_revision">Needs revision</option>
            </select>
          </label>
          <label>
            Include tags (comma separated)
            <input
              value={form.includeTags.join(', ')}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  includeTags: event.target.value
                    .split(',')
                    .map((tag) => tag.trim())
                    .filter(Boolean),
                }))
              }
            />
          </label>
          <label>
            Spread over days
            <input
              type="number"
              min={1}
              value={form.spreadOverDays ?? 3}
              onChange={(event) => setForm((prev) => ({ ...prev, spreadOverDays: Number(event.target.value) }))}
            />
          </label>
        </div>
        <div className="revision-form__actions">
          <button className="study-button" onClick={handleAddPass}>
            Save pass
          </button>
          {revisionPasses.length > 0 && (
            <button
              className="study-button secondary"
              onClick={() => revisionPasses.forEach((pass) => scheduleRevisionPass(pass))}
            >
              Distribute revision tasks
            </button>
          )}
        </div>
        {message && <p className="planner-info">{message}</p>}
      </section>

      <section className="revision-pass-list">
        <h3>Configured passes</h3>
        {revisionPasses.length === 0 && <p className="muted">No revision passes yet.</p>}
        <div className="revision-pass-grid">
          {revisionPasses.map((pass) => (
            <article key={pass.id} className="revision-pass-card">
              <h4>{pass.name}</h4>
              <p className="muted">
                {pass.trigger === 'after_finish'
                  ? 'After all lectures are complete'
                  : `${pass.offsetDaysBeforeExam} days before exam`}
              </p>
              <p className="muted">
                Include statuses: {(pass.includeStatuses ?? ['done', 'needs_revision']).join(', ')}
              </p>
              {pass.includeTags && pass.includeTags.length > 0 && (
                <p className="muted">Tags: {pass.includeTags.join(', ')}</p>
              )}
              <p className="muted">Spread over {pass.spreadOverDays ?? 3} day(s)</p>
              <div className="lecture-buttons">
                <button className="study-button secondary" onClick={() => scheduleRevisionPass(pass)}>
                  Schedule now
                </button>
                <button className="study-button secondary" onClick={() => actions.deleteRevisionPass(pass.id)}>
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="revision-upcoming">
        <h3>Upcoming revision tasks</h3>
        {upcomingRevision.length === 0 && <p className="muted">No revision tasks scheduled.</p>}
        <div className="revision-upcoming__list">
          {upcomingRevision.map((day) => (
            <div key={day.date} className="revision-upcoming__item">
              <strong>{dayjs(day.date).format('DD MMM')}</strong>
              <span>{day.items.length} task(s)</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
