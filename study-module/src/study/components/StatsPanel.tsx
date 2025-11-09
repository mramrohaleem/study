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
    .filter((meta) => meta.mood !== undefined || meta.energy !== undefined)
    .slice(-7)
    .map((meta) => {
      const studyDay = state.studyDays.find((day) => day.date === meta.date);
      return {
        date: meta.date,
        mood: meta.mood,
        energy: meta.energy,
        minutes: studyDay?.completedMinutes ?? 0,
      };
    });

  return (
    <div className="stats-panel">
      <button className="link-button" onClick={() => onNavigate({ type: 'dashboard' })}>
        ← العودة إلى لوحة التحكم
      </button>
      <header className="stats-header">
        <div>
          <h1>لوحة الإحصاءات</h1>
          <p className="muted">راقب تقدمك، التزامك بالخطة، وعلاقتك بالمزاج والطاقة.</p>
        </div>
      </header>

      <section className="stats-overview">
        <div className="stats-card">
          <span className="summary-label">الدقائق في هذا الأسبوع</span>
          <h2>{stats.totalMinutes}</h2>
        </div>
        <div className="stats-card">
          <span className="summary-label">الدروس المنجزة</span>
          <h2>{stats.lecturesCompleted}</h2>
        </div>
        <div className="stats-card">
          <span className="summary-label">الالتزام بالخطة</span>
          <h2>{stats.adherence}%</h2>
        </div>
        <div className="stats-card">
          <span className="summary-label">سلسلة الإنجاز الحالية</span>
          <h2>{stats.streak} يوم</h2>
        </div>
      </section>

      <section className="stats-breakdown">
        <div className="stats-breakdown__section">
          <h3>أكثر مادة تمت دراستها</h3>
          <p>
            {stats.mostStudiedSubjectId
              ? state.subjects.find((subject) => subject.id === stats.mostStudiedSubjectId)?.name ?? '—'
              : '—'}
          </p>
          <span className="muted">استناداً إلى الدروس المنجزة هذا الأسبوع</span>
        </div>
        <div className="stats-breakdown__section">
          <h3>الاختبارات القادمة</h3>
          <ul>
            {state.subjects
              .filter((subject) => !subject.archived)
              .sort((a, b) => dayjs(a.examDate).valueOf() - dayjs(b.examDate).valueOf())
              .slice(0, 3)
              .map((subject) => (
                <li key={subject.id}>
                  <strong>{subject.name}</strong> — {dayjs(subject.examDate).format('DD MMM')} ({dayjs(subject.examDate).diff(dayjs(), 'day')} يوم)
                </li>
              ))}
          </ul>
        </div>
      </section>

      <section className="stats-mood">
        <h3>المزاج والطاقة</h3>
        {moodInsights.length === 0 ? (
          <p className="muted">سجل مستوى المزاج والطاقة من لوحة اليوم لمشاهدة الأنماط.</p>
        ) : (
          <div className="mood-grid">
            {moodInsights.map((entry) => (
              <div key={entry.date} className="mood-card">
                <strong>{dayjs(entry.date).format('DD MMM')}</strong>
                <span>المزاج: {entry.mood ?? '—'}/5</span>
                <span>الطاقة: {entry.energy ?? '—'}/5</span>
                <span>الدقائق: {entry.minutes}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
