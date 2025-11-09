import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { SectionView } from '../StudySection';
import { useStudyActions, useStudyState } from '../state';

interface FocusModeProps {
  lectureId: string;
  onNavigate: (view: SectionView) => void;
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
  return `${mins}:${secs}`;
};

export const FocusMode: React.FC<FocusModeProps> = ({ lectureId, onNavigate }) => {
  const state = useStudyState();
  const actions = useStudyActions();
  const [showResult, setShowResult] = useState(false);

  const lecture = state.lectures.find((item) => item.id === lectureId);
  const subject = lecture ? state.subjects.find((item) => item.id === lecture.subjectId) : undefined;
  const session = state.focusSession;

  useEffect(() => {
    if (!lecture) return;
    if (!session || session.lectureId !== lectureId) {
      actions.startFocusSession(lectureId);
    }
  }, [lectureId, lecture, session, actions]);

  useEffect(() => {
    if (!session?.isRunning) return;
    const interval = setInterval(() => {
      actions.updateFocusSession(1, true);
    }, 1000);
    return () => clearInterval(interval);
  }, [session?.isRunning, actions]);

  if (!lecture) {
    return (
      <div className="focus-mode">
        <button className="link-button" onClick={() => onNavigate({ type: 'dashboard' })}>
          ← Back to dashboard
        </button>
        <p>Lecture not found.</p>
      </div>
    );
  }

  const remainingSeconds = session?.remainingSeconds ?? lecture.estimatedMinutes * 60;
  const isRunning = session?.isRunning ?? true;
  const elapsedMinutes = session ? session.durationMinutes - session.remainingSeconds / 60 : 0;

  const handleToggle = () => {
    if (!session) return;
    actions.updateFocusSession(0, !session.isRunning);
  };

  const finalizeSession = (result: 'finished' | 'not_finished' | 'needs_revision') => {
    const minutes = Math.max(1, Math.round(elapsedMinutes));
    actions.endFocusSession(result, minutes);
    setShowResult(false);
    if (result === 'finished') {
      setTimeout(() => onNavigate({ type: 'dashboard' }), 400);
    }
  };

  return (
    <div className="focus-mode">
      <button className="link-button" onClick={() => onNavigate({ type: 'lecture', lectureId })}>
        ← Exit focus
      </button>
      <div className="focus-panel">
        <div className="focus-panel__subject" style={{ borderColor: subject?.color ?? '#4c6ef5' }}>
          <span style={{ color: subject?.color ?? '#4c6ef5' }}>{subject?.name ?? 'Subject'}</span>
          <h1>{lecture.title}</h1>
          <p>{lecture.estimatedMinutes} minutes · {lecture.type}</p>
        </div>
        <div className="focus-timer">
          <div className="focus-timer__clock">{formatTime(remainingSeconds)}</div>
          <div className="focus-timer__controls">
            <button className="study-button" onClick={handleToggle}>
              {isRunning ? 'Pause' : 'Resume'}
            </button>
            <button className="study-button secondary" onClick={() => setShowResult(true)}>
              End session
            </button>
          </div>
          <p className="muted">Started at {session ? dayjs(session.startedAt).format('HH:mm') : dayjs().format('HH:mm')}</p>
        </div>
      </div>
      {showResult && (
        <div className="focus-result">
          <h3>How did it go?</h3>
          <div className="focus-result__buttons">
            <button className="study-button" onClick={() => finalizeSession('finished')}>
              Finished
            </button>
            <button className="study-button secondary" onClick={() => finalizeSession('not_finished')}>
              Not finished
            </button>
            <button className="study-button secondary" onClick={() => finalizeSession('needs_revision')}>
              Needs revision
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
