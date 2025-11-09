import { useEffect, useMemo, useState } from 'react';
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

export const FocusMode: React.FC<FocusModeProps> = ({ lectureId, onNavigate }) => {
  const state = useStudyState();
  const actions = useStudyActions();
  const lecture = state.lectures.find((item) => item.id === lectureId);
  const subject = lecture ? state.subjects.find((item) => item.id === lecture.subjectId) : undefined;
  const activeSession = state.focusSession && state.focusSession.lectureId === lectureId ? state.focusSession : null;
  const typeLabel: Record<LectureType, string> = {
    lecture: 'محاضرة',
    section: 'سكشن',
    mcq: 'أسئلة اختيار من متعدد',
    case: 'حالة',
    other: 'أخرى',
  };

  const [selectedDuration, setSelectedDuration] = useState(
    () => state.settings.defaultFocusMinutesWork || 25,
  );
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    if (activeSession) {
      setSelectedDuration(activeSession.durationMinutes);
    }
  }, [activeSession]);

  useEffect(() => {
    if (!activeSession?.isRunning) return;
    if (activeSession.remainingSeconds <= 0) return;
    const interval = setInterval(() => {
      actions.updateFocusSession(1, true);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeSession?.isRunning, activeSession?.remainingSeconds, actions]);

  useEffect(() => {
    if (!activeSession) return;
    if (activeSession.remainingSeconds <= 0) {
      if (activeSession.isRunning) {
        actions.updateFocusSession(0, false);
      }
      setShowResult(true);
    }
  }, [activeSession, actions]);

  const remainingSeconds = activeSession?.remainingSeconds ?? selectedDuration * 60;
  const isRunning = activeSession?.isRunning ?? false;
  const elapsedMinutes = activeSession ? activeSession.durationMinutes - activeSession.remainingSeconds / 60 : 0;

  const durationOptions = useMemo(() => {
    const defaults = [state.settings.defaultFocusMinutesWork, selectedDuration, 25, 45, 60];
    const unique = Array.from(new Set(defaults.filter(Boolean))).sort((a, b) => a - b);
    return unique;
  }, [state.settings.defaultFocusMinutesWork, selectedDuration]);

  const startSession = () => {
    if (!lecture) return;
    actions.startFocusSession(lectureId, selectedDuration);
    setShowResult(false);
  };

  const handleToggle = () => {
    if (!activeSession) return;
    actions.updateFocusSession(0, !activeSession.isRunning);
  };

  const finalizeSession = (result: 'finished' | 'not_finished' | 'needs_revision') => {
    if (!activeSession) return;
    const rounded = Math.round(elapsedMinutes);
    const minutes = rounded > 0 ? rounded : result === 'finished' ? selectedDuration : 0;
    actions.endFocusSession(result, minutes);
    setShowResult(false);
    onNavigate({ type: 'dashboard' });
  };

  if (!lecture) {
    return (
      <div className="focus-mode">
        <button className="link-button" onClick={() => onNavigate({ type: 'dashboard' })}>
          ← العودة إلى لوحة التحكم
        </button>
        <p>الدرس غير موجود.</p>
      </div>
    );
  }

  return (
    <div className="focus-mode">
      <button className="link-button" onClick={() => onNavigate({ type: 'lecture', lectureId })}>
        ← الخروج من وضع التركيز
      </button>
      <div className="focus-panel">
        <div className="focus-panel__subject" style={{ borderColor: subject?.color ?? '#4c6ef5' }}>
          <span style={{ color: subject?.color ?? '#4c6ef5' }}>{subject?.name ?? 'المادة'}</span>
          <h1>{lecture.title}</h1>
          <p>{lecture.estimatedMinutes} دقيقة · {typeLabel[lecture.type]}</p>
        </div>
        {activeSession ? (
          <div className="focus-timer">
            <div className="focus-timer__clock">{formatTime(remainingSeconds)}</div>
            <div className="focus-timer__controls">
              <button className="study-button" onClick={handleToggle}>
                {isRunning ? 'إيقاف مؤقت' : 'استئناف'}
              </button>
              <button className="study-button secondary" onClick={() => setShowResult(true)}>
                إنهاء الجلسة
              </button>
            </div>
            <p className="muted">بدأت في {dayjs(activeSession.startedAt).format('HH:mm')}</p>
          </div>
        ) : (
          <div className="focus-setup">
            <label>
              مدة الجلسة (بالدقائق)
              <select value={selectedDuration} onChange={(event) => setSelectedDuration(Number(event.target.value))}>
                {durationOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <button className="study-button" onClick={startSession}>
              ابدأ الجلسة
            </button>
          </div>
        )}
      </div>
      {showResult && activeSession && (
        <div className="focus-result">
          <h3>كيف سارت الجلسة؟</h3>
          <div className="focus-result__buttons">
            <button className="study-button" onClick={() => finalizeSession('finished')}>
              أنجزت الدرس
            </button>
            <button className="study-button secondary" onClick={() => finalizeSession('not_finished')}>
              لم أنجز بعد
            </button>
            <button className="study-button secondary" onClick={() => finalizeSession('needs_revision')}>
              أحتاج لمراجعة
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
