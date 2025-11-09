import { FormEvent, useEffect, useState } from 'react';
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
    maxLectures: state.settings.maxLecturesPerDay ?? 5,
    maxMinutes: state.settings.maxMinutesPerDay ?? 240,
    minLectures: state.settings.streakMinLecturesOrMinutes.minLectures,
    minMinutes: state.settings.streakMinLecturesOrMinutes.minMinutes,
    autoReplan: state.settings.autoReplanEnabled,
  });

  useEffect(() => {
    setForm({
      work: state.settings.defaultFocusMinutesWork,
      breakMinutes: state.settings.defaultFocusMinutesBreak,
      maxLectures: state.settings.maxLecturesPerDay ?? 5,
      maxMinutes: state.settings.maxMinutesPerDay ?? 240,
      minLectures: state.settings.streakMinLecturesOrMinutes.minLectures,
      minMinutes: state.settings.streakMinLecturesOrMinutes.minMinutes,
      autoReplan: state.settings.autoReplanEnabled,
    });
  }, [state.settings]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    actions.updateSettings({
      defaultFocusMinutesWork: Number(form.work) || 25,
      defaultFocusMinutesBreak: Number(form.breakMinutes) || 5,
      maxLecturesPerDay: Number(form.maxLectures) || undefined,
      maxMinutesPerDay: Number(form.maxMinutes) || undefined,
      streakMinLecturesOrMinutes: {
        minLectures: Number(form.minLectures) || 1,
        minMinutes: Number(form.minMinutes) || 15,
      },
      autoReplanEnabled: form.autoReplan,
    });
    onNavigate({ type: 'dashboard' });
  };

  return (
    <div className="settings-view">
      <button className="link-button" onClick={() => onNavigate({ type: 'dashboard' })}>
        ← العودة إلى لوحة الدراسة
      </button>
      <header className="settings-header">
        <div>
          <h1>الإعدادات العامة للدراسة</h1>
          <p className="muted">اضبط إيقاع جلسات التركيز والحدود اليومية لتوزيع المحاضرات.</p>
        </div>
      </header>

      <form className="settings-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label>
            مدة جلسة التركيز الأساسية (بالدقائق)
            <input
              type="number"
              min={10}
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
            الحد الأقصى للمحاضرات يوميًا
            <input
              type="number"
              min={1}
              value={form.maxLectures}
              onChange={(event) => setForm((prev) => ({ ...prev, maxLectures: Number(event.target.value) }))}
            />
          </label>
          <label>
            الحد الأقصى للدقائق يوميًا
            <input
              type="number"
              min={30}
              value={form.maxMinutes}
              onChange={(event) => setForm((prev) => ({ ...prev, maxMinutes: Number(event.target.value) }))}
            />
          </label>
          <label>
            أقل عدد محاضرات لاحتساب سلسلة الإنجاز
            <input
              type="number"
              min={0}
              value={form.minLectures}
              onChange={(event) => setForm((prev) => ({ ...prev, minLectures: Number(event.target.value) }))}
            />
          </label>
          <label>
            أقل عدد دقائق لاحتساب سلسلة الإنجاز
            <input
              type="number"
              min={0}
              value={form.minMinutes}
              onChange={(event) => setForm((prev) => ({ ...prev, minMinutes: Number(event.target.value) }))}
            />
          </label>
        </div>
        <label className="checkbox-inline">
          <input
            type="checkbox"
            checked={form.autoReplan}
            onChange={(event) => setForm((prev) => ({ ...prev, autoReplan: event.target.checked }))}
          />
          <span>إعادة التخطيط تلقائيًا عند حدوث تغييرات كبيرة</span>
        </label>
        <footer className="modal__footer settings-footer">
          <button type="submit" className="study-button">
            حفظ الإعدادات
          </button>
        </footer>
      </form>
    </div>
  );
};
