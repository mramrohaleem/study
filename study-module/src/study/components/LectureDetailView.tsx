import { SectionView } from '../StudySection';
import { useStudyActions, useStudyState } from '../state';
import { getLectureStatusLabel } from '../utils/selectors';

interface LectureDetailViewProps {
  lectureId: string;
  onNavigate: (view: SectionView) => void;
}

export const LectureDetailView: React.FC<LectureDetailViewProps> = ({ lectureId, onNavigate }) => {
  const state = useStudyState();
  const actions = useStudyActions();

  const lecture = state.lectures.find((item) => item.id === lectureId);
  if (!lecture) {
    return (
      <div className="lecture-detail">
        <button className="link-button" onClick={() => onNavigate({ type: 'dashboard' })}>
          ← Back to dashboard
        </button>
        <p>Lecture not found.</p>
      </div>
    );
  }

  const subject = state.subjects.find((item) => item.id === lecture.subjectId);

  return (
    <div className="lecture-detail">
      <button className="link-button" onClick={() => onNavigate({ type: 'subject', subjectId: lecture.subjectId })}>
        ← Back to subject
      </button>
      <header className="lecture-header" style={{ borderColor: subject?.color ?? '#4c6ef5' }}>
        <div>
          <span className="badge" style={{ background: subject?.color ?? '#4c6ef5', color: 'white' }}>
            {subject?.name ?? 'Subject'}
          </span>
          <h1>{lecture.title}</h1>
          <p className="muted">
            {getLectureStatusLabel(lecture.status)} · {lecture.estimatedMinutes} minutes · {lecture.type}
          </p>
        </div>
        <button className="study-button" onClick={() => onNavigate({ type: 'focus', lectureId })}>
          Start focus session
        </button>
      </header>

      <section className="lecture-meta">
        <div>
          <span className="muted">Order</span>
          <h3>#{lecture.order}</h3>
        </div>
        <div>
          <span className="muted">Priority</span>
          <h3>{lecture.priority ?? 'normal'}</h3>
        </div>
        <div>
          <span className="muted">Tags</span>
          <div className="tag-row">
            {lecture.tags.length ? (
              lecture.tags.map((tag) => (
                <span key={tag} className="tag">
                  {tag}
                </span>
              ))
            ) : (
              <span className="muted">No tags</span>
            )}
          </div>
        </div>
      </section>

      {lecture.sourceLink && (
        <a className="study-button secondary" href={lecture.sourceLink} target="_blank" rel="noreferrer">
          Open source material
        </a>
      )}

      <section className="lecture-actions">
        <h3>Update status</h3>
        <div className="lecture-buttons">
          <button className="study-button" onClick={() => actions.markLectureStatus(lectureId, 'done')}>
            Mark as done
          </button>
          <button className="study-button secondary" onClick={() => actions.markLectureStatus(lectureId, 'needs_revision')}>
            Needs revision
          </button>
          <button className="study-button secondary" onClick={() => actions.markLectureStatus(lectureId, 'not_started')}>
            Reset status
          </button>
        </div>
      </section>
    </div>
  );
};
