import dayjs from 'dayjs';
import { SectionView } from '../StudySection';
import { useStudyState } from '../state';
import { computeWeekStats } from '../utils/selectors';

interface StatsPanelProps {
  onNavigate: (view: SectionView) => void;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({ onNavigate }) => {
  const state = useStudyState();
  const stats = computeWeekStats(state);

  const moodInsights = state.dayMeta
    .filter((meta) => meta.mood && meta.energy)
    .slice(-7)
    .map((meta) => {
      const studyDay = state.studyDays.find((day) => day.date === meta.date);
      return {
        date: meta.date,
        mood: meta.mood ?? 0,
        energy: meta.energy ?? 0,
        minutes: studyDay?.completedMinutes ?? 0,
      };
    });

  return (
    <div className="stats-panel">
      <button className="link-button" onClick={() => onNavigate({ type: 'dashboard' })}>
        ← Back to dashboard
      </button>
      <header className="stats-header">
        <div>
          <h1>Study insights</h1>
          <p className="muted">Track momentum, adherence, and motivation signals.</p>
        </div>
      </header>

      <section className="stats-overview">
        <div className="stats-card">
          <span className="summary-label">Minutes studied (week)</span>
          <h2>{stats.totalMinutes}</h2>
        </div>
        <div className="stats-card">
          <span className="summary-label">Lectures completed</span>
          <h2>{stats.lecturesCompleted}</h2>
        </div>
        <div className="stats-card">
          <span className="summary-label">Plan adherence</span>
          <h2>{stats.adherence}%</h2>
        </div>
        <div className="stats-card">
          <span className="summary-label">Current streak</span>
          <h2>{stats.streak} days</h2>
        </div>
      </section>

      <section className="stats-breakdown">
        <div className="stats-breakdown__section">
          <h3>Most studied subject</h3>
          <p>
            {stats.mostStudiedSubjectId
              ? state.subjects.find((subject) => subject.id === stats.mostStudiedSubjectId)?.name ?? '—'
              : '—'}
          </p>
          <span className="muted">Based on completed lectures this week</span>
        </div>
        <div className="stats-breakdown__section">
          <h3>Upcoming exams</h3>
          <ul>
            {state.subjects
              .filter((subject) => !subject.archived)
              .sort((a, b) => dayjs(a.examDate).valueOf() - dayjs(b.examDate).valueOf())
              .slice(0, 3)
              .map((subject) => (
                <li key={subject.id}>
                  <strong>{subject.name}</strong> — {dayjs(subject.examDate).format('DD MMM')} ({dayjs(subject.examDate).diff(dayjs(), 'day')} days)
                </li>
              ))}
          </ul>
        </div>
      </section>

      <section className="stats-mood">
        <h3>Mood & energy correlation</h3>
        {moodInsights.length === 0 ? (
          <p className="muted">Add mood and energy logs to see patterns.</p>
        ) : (
          <div className="mood-grid">
            {moodInsights.map((entry) => (
              <div key={entry.date} className="mood-card">
                <strong>{dayjs(entry.date).format('DD MMM')}</strong>
                <span>Mood: {entry.mood}/5</span>
                <span>Energy: {entry.energy}/5</span>
                <span>Minutes: {entry.minutes}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
