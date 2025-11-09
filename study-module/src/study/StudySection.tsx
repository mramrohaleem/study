import { useEffect, useState } from 'react';
import { StudyProvider } from './state';
import './study.css';
import { StudyEvent, StudySectionProps } from './types';
import { studyEventBus } from './events';
import { DashboardView } from './components/DashboardView';
import { SubjectView } from './components/SubjectView';
import { LectureDetailView } from './components/LectureDetailView';
import { FocusMode } from './components/FocusMode';
import { RevisionPlannerView } from './components/RevisionPlannerView';
import { StatsPanel } from './components/StatsPanel';
import { SettingsView } from './components/SettingsView';

export type SectionView =
  | { type: 'dashboard' }
  | { type: 'subject'; subjectId: string }
  | { type: 'lecture'; lectureId: string }
  | { type: 'focus'; lectureId: string }
  | { type: 'revisionPlanner'; subjectId?: string }
  | { type: 'stats' }
  | { type: 'settings' };

const StudySectionShell: React.FC<{ onChangeView: (view: SectionView) => void; currentView: SectionView }> = ({
  onChangeView,
  currentView,
}) => {
  switch (currentView.type) {
    case 'dashboard':
      return <DashboardView onNavigate={onChangeView} />;
    case 'subject':
      return <SubjectView subjectId={currentView.subjectId} onNavigate={onChangeView} />;
    case 'lecture':
      return <LectureDetailView lectureId={currentView.lectureId} onNavigate={onChangeView} />;
    case 'focus':
      return <FocusMode lectureId={currentView.lectureId} onNavigate={onChangeView} />;
    case 'revisionPlanner':
      return <RevisionPlannerView subjectId={currentView.subjectId} onNavigate={onChangeView} />;
    case 'stats':
      return <StatsPanel onNavigate={onChangeView} />;
    case 'settings':
      return <SettingsView onNavigate={onChangeView} />;
    default:
      return <DashboardView onNavigate={onChangeView} />;
  }
};

export const StudySection: React.FC<StudySectionProps> = ({ onEvent, initialState }) => {
  const [view, setView] = useState<SectionView>({ type: 'dashboard' });

  useEffect(() => {
    if (!onEvent) return;
    const unsubscribe = studyEventBus.subscribe((event: StudyEvent) => {
      onEvent(event);
    });
    return () => {
      unsubscribe();
    };
  }, [onEvent]);

  return (
    <StudyProvider initialState={initialState}>
      <div className="study-section" dir="rtl">
        <StudySectionShell currentView={view} onChangeView={setView} />
      </div>
    </StudyProvider>
  );
};
