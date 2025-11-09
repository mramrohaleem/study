import { useState } from 'react';
import { SectionView } from '../StudySection';
import { useStudyActions, useStudyState } from '../state';

interface SettingsViewProps {
  onNavigate: (view: SectionView) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onNavigate }) => {
  const state = useStudyState();
  const actions = useStudyActions();
  const [form, setForm] = useState({
    work: state.settings.defaultFocusMinutesWork,
    breakMinutes: state.settings.defaultFocusMinutesBreak,
    maxLectures: state.settings.maxLecturesPerDay ?? 0,
    maxMinutes: state.settings.maxMinutesPerDay ?? 0,
    streakLectures: state.settings.streakMinLecturesOrMinutes.minLectures,
    streakMinutes: state.settings.streakMinLecturesOrMinutes.minMinutes,
    autoReplan: state.settings.autoReplanEnabled,
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const work = Math.max(5, Number(form.work) || 0);
    const breakMinutes = Math.max(1, Number(form.breakMinutes) || 0);
    const maxLectures = form.maxLectures > 0 ? form.maxLectures : undefined;
    const maxMinutes = form.maxMinutes > 0 ? form.maxMinutes : undefined;
    const streakLectures = Math.max(0, Number(form.streakLectures) || 0);
    const streakMinutes = Math.max(0, Number(form.streakMinutes) || 0);
    actions.updateSettings({
      defaultFocusMinutesWork: work,
      defaultFocusMinutesBreak: breakMinutes,
      maxLecturesPerDay: maxLectures,
      maxMinutesPerDay: maxMinutes,
      streakMinLecturesOrMinutes: {
        minLectures: streakLectures,
        minMinutes: streakMinutes,
      },
      autoReplanEnabled: form.autoReplan,
    });
    setForm((prev) => ({
      ...prev,
      work,
      breakMinutes,
      maxLectures: maxLectures ?? 0,
      maxMinutes: maxMinutes ?? 0,
      streakLectures,
      streakMinutes,
    }));
  };

  return (
    <div className="settings-view">
      <button className="link-button" onClick={() => onNavigate({ type: 'dashboard' })}>
        ← العودة إلى لوحة التحكم
      </button>
      <header className="settings-header">
        <h1>الإعدادات</h1>
        <p className="muted">اضبط التفضيلات العامة لطريقة المذاكرة الخاصة بك.</p>
      </header>
      <form className="settings-form" onSubmit={handleSubmit}>
        <label>
          مدة جلسة التركيز الافتراضية (بالدقائق)
          <input
            type="number"
            min={5}
            value={form.work}
            onChange={(event) => setForm((prev) => ({ ...prev, work: Number(event.target.value) }))}
          />
        </label>
        <label>
          مدة الاستراحة الافتراضية (بالدقائق)
          <input
            type="number"
            min={1}
            value={form.breakMinutes}
            onChange={(event) => setForm((prev) => ({ ...prev, breakMinutes: Number(event.target.value) }))}
          />
        </label>
        <label>
          الحد الأقصى للمحاضرات في اليوم
          <input
            type="number"
            min={0}
            value={form.maxLectures}
            onChange={(event) => setForm((prev) => ({ ...prev, maxLectures: Number(event.target.value) }))}
            placeholder="اتركه صفراً للتجاهل"
          />
        </label>
        <label>
          الحد الأقصى للدقائق في اليوم
          <input
            type="number"
            min={0}
            value={form.maxMinutes}
            onChange={(event) => setForm((prev) => ({ ...prev, maxMinutes: Number(event.target.value) }))}
            placeholder="اتركه صفراً للتجاهل"
          />
        </label>
        <label>
          الحد الأدنى للمحاضرات لسلسلة الإنجاز
          <input
            type="number"
            min={0}
            value={form.streakLectures}
            onChange={(event) => setForm((prev) => ({ ...prev, streakLectures: Number(event.target.value) }))}
          />
        </label>
        <label>
          الحد الأدنى للدقائق لسلسلة الإنجاز
          <input
            type="number"
            min={0}
            value={form.streakMinutes}
            onChange={(event) => setForm((prev) => ({ ...prev, streakMinutes: Number(event.target.value) }))}
          />
        </label>
        <label className="settings-checkbox">
          <input
            type="checkbox"
            checked={form.autoReplan}
            onChange={(event) => setForm((prev) => ({ ...prev, autoReplan: event.target.checked }))}
          />
          تفعيل إعادة التخطيط التلقائي
        </label>
        <button type="submit" className="study-button">
          حفظ الإعدادات
        </button>
      </form>
    </div>
  );
};
