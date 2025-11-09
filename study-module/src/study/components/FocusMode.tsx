import { useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { SectionView } from '../StudySection';
import { useStudyActions, useStudyState } from '../state';
import { LectureType } from '../types';

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

const lectureTypeLabel: Record<LectureType, string> = {
  lecture: 'محاضرة',
  section: 'قسم عملي',
  mcq: 'أسئلة اختيار من متعدد',
  case: 'حالة سريرية',
  other: 'أخرى',
};

export const FocusMode: React.FC<FocusModeProps> = ({ lectureId, onNavigate }) => {
  const state = useStudyState();
  const actions = useStudyActions();
  const lecture = state.lectures.find((item) => item.id === lectureId);
  const subject = lecture ? state.subjects.find((item) => item.id === lecture.subjectId) : undefined;
  const session = state.focusSession && state.focusSession.lectureId === lectureId ? state.focusSession : null;

  const defaultDuration = state.settings.defaultFocusMinutesWork;
  const [desiredDuration, setDesiredDuration] = useState(defaultDuration);
  const [showResult, setShowResult] = useState(false);
  const [hasStarted, setHasStarted] = useState(() => Boolean(session));
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!session) {
      setDesiredDuration(defaultDuration);
    }
  }, [defaultDuration, session]);

  useEffect(() => {
    if (session) {
      initializedRef.current = true;
    }
    if (session) {
      setHasStarted(true);
    } else if (!initializedRef.current) {
      setHasStarted(false);
    }
  }, [session]);

  useEffect(() => {
    if (!session?.isRunning) return;
    const interval = setInterval(() => {
      actions.updateFocusSession(1, true);
    }, 1000);
    return () => clearInterval(interval);
  }, [session?.isRunning, actions]);

  useEffect(() => {
    if (session && session.remainingSeconds <= 0 && session.isRunning) {
      actions.updateFocusSession(0, false);
      setShowResult(true);
    }
  }, [session, actions]);

  useEffect(() => {
    if (!session && hasStarted && initializedRef.current) {
      setHasStarted(false);
    }
  }, [session, hasStarted]);

  const remainingSeconds = session ? session.remainingSeconds : desiredDuration * 60;
  const isRunning = session?.isRunning ?? false;
  const elapsedMinutes = session ? session.durationMinutes - session.remainingSeconds / 60 : 0;

  if (!lecture) {
    return (
      <div className="focus-mode">
        <button className="link-button" onClick={() => onNavigate({ type: 'dashboard' })}>
          ← العودة إلى اللوحة
        </button>
        <p>لم يتم العثور على هذه المحاضرة.</p>
      </div>
    );
  }

  const durationOptions = useMemo(() => {
    const base = [defaultDuration, 45, 60];
    const unique = Array.from(new Set(base.filter((value) => value > 0))).sort((a, b) => a - b);
    return unique;
  }, [defaultDuration]);

  const handleStart = () => {
    actions.startFocusSession(lectureId, desiredDuration);
    initializedRef.current = true;
    setShowResult(false);
    setHasStarted(true);
  };

  const handleToggle = () => {
    if (!session) return;
    actions.updateFocusSession(0, !session.isRunning);
  };

  const handleEnd = () => {
    if (session && session.isRunning) {
      actions.updateFocusSession(0, false);
    }
    setShowResult(true);
  };

  const finalizeSession = (result: 'finished' | 'not_finished' | 'needs_revision') => {
    const minutes = session ? Math.max(1, Math.round(elapsedMinutes)) : desiredDuration;
    actions.endFocusSession(result, minutes);
    setShowResult(false);
    initializedRef.current = false;
    if (result === 'finished') {
      setTimeout(() => onNavigate({ type: 'dashboard' }), 400);
    }
  };

  return (
    <div className="focus-mode">
      <button className="link-button" onClick={() => onNavigate({ type: 'lecture', lectureId })}>
        ← الخروج من وضع التركيز
      </button>
      <div className="focus-panel">
        <div className="focus-panel__subject" style={{ borderColor: subject?.color ?? '#4c6ef5' }}>
          <span style={{ color: subject?.color ?? '#4c6ef5' }}>{subject?.name ?? 'المادة'}</span>
          <h1>{lecture.title}</h1>
          <p>
            {lecture.estimatedMinutes} دقيقة تقديرية · {lectureTypeLabel[lecture.type] ?? 'محاضرة'}
          </p>
        </div>
        <div className="focus-timer">
          <div className="focus-timer__clock">{formatTime(remainingSeconds)}</div>
          {hasStarted && session ? (
            <div className="focus-timer__controls">
              <button className="study-button" onClick={handleToggle}>
                {isRunning ? 'إيقاف مؤقت' : 'استئناف'}
              </button>
              <button className="study-button secondary" onClick={handleEnd}>
                إنهاء الجلسة
              </button>
            </div>
          ) : (
            <div className="focus-start">
              <label>
                مدة الجلسة بالدقائق
                <select value={desiredDuration} onChange={(event) => setDesiredDuration(Number(event.target.value))}>
                  {durationOptions.map((value) => (
                    <option key={value} value={value}>
                      {value} دقيقة
                    </option>
                  ))}
                </select>
              </label>
              <button className="study-button" onClick={handleStart}>
                بدء الجلسة
              </button>
            </div>
          )}
          <p className="muted">
            بدأت الجلسة عند {session ? dayjs(session.startedAt).format('HH:mm') : dayjs().format('HH:mm')}
          </p>
        </div>
      </div>
      {showResult && (
        <div className="focus-result">
          <h3>كيف سارت الجلسة؟</h3>
          <div className="focus-result__buttons">
            <button className="study-button" onClick={() => finalizeSession('finished')}>
              أنهيت المهمة
            </button>
            <button className="study-button secondary" onClick={() => finalizeSession('not_finished')}>
              لم أنتهِ بعد
            </button>
            <button className="study-button secondary" onClick={() => finalizeSession('needs_revision')}>
              أحتاج مراجعة لاحقًا
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
