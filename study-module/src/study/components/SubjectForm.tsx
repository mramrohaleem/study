import { useState } from 'react';
import dayjs from 'dayjs';
import { Difficulty } from '../types';

const importanceOptions = [
  { value: 0.8, label: 'أولوية منخفضة' },
  { value: 1.0, label: 'أولوية عادية (افتراضي)' },
  { value: 1.3, label: 'أولوية مرتفعة' },
];

const normalizeWeight = (raw?: number): number => {
  const options = importanceOptions.map((option) => option.value);
  if (raw == null || Number.isNaN(raw)) return 1.0;
  let best = options[0];
  let bestDiff = Math.abs(raw - best);
  for (const value of options) {
    const diff = Math.abs(raw - value);
    if (diff < bestDiff) {
      best = value;
      bestDiff = diff;
    }
  }
  return best;
};

export interface SubjectFormValues {
  name: string;
  color: string;
  examDate: string;
  difficulty: Difficulty;
  reservedRevisionDays: number;
  weight: number;
  notes?: string;
}

interface SubjectFormProps {
  initial?: Partial<SubjectFormValues>;
  onCancel: () => void;
  onSubmit: (values: SubjectFormValues) => void;
  title: string;
  submitLabel?: string;
}

export const SubjectForm: React.FC<SubjectFormProps> = ({
  initial,
  onCancel,
  onSubmit,
  title,
  submitLabel = 'حفظ',
}) => {
  const [form, setForm] = useState<SubjectFormValues>({
    name: initial?.name ?? '',
    color: initial?.color ?? '#4c6ef5',
    examDate: initial?.examDate ?? dayjs().add(30, 'day').format('YYYY-MM-DD'),
    difficulty: initial?.difficulty ?? 'medium',
    reservedRevisionDays: initial?.reservedRevisionDays ?? 3,
    weight: normalizeWeight(initial?.weight),
    notes: initial?.notes ?? '',
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) {
      return;
    }
    onSubmit({ ...form, notes: form.notes?.trim() ? form.notes : undefined });
  };

  return (
    <div className="study-modal">
      <div className="study-modal__content">
        <div className="study-modal__header">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onCancel} aria-label="إغلاق">
            ×
          </button>
        </div>
        <form className="study-form" onSubmit={handleSubmit}>
          <label>
            اسم المادة
            <input
              type="text"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="مثال: علم الأمراض"
              required
            />
          </label>
          <label>
            لون مميز
            <input
              type="color"
              value={form.color}
              onChange={(event) => setForm((prev) => ({ ...prev, color: event.target.value }))}
            />
          </label>
          <label>
            تاريخ الامتحان
            <input
              type="date"
              value={form.examDate}
              onChange={(event) => setForm((prev) => ({ ...prev, examDate: event.target.value }))}
            />
          </label>
          <label>
            مستوى الصعوبة
            <select
              value={form.difficulty}
              onChange={(event) => setForm((prev) => ({ ...prev, difficulty: event.target.value as Difficulty }))}
            >
              <option value="easy">سهل</option>
              <option value="medium">متوسط</option>
              <option value="hard">صعب</option>
            </select>
          </label>
          <label>
            أيام المراجعة المحجوزة
            <input
              type="number"
              min={0}
              value={form.reservedRevisionDays}
              onChange={(event) => setForm((prev) => ({ ...prev, reservedRevisionDays: Number(event.target.value) }))}
            />
          </label>
          <label>
            أولوية المادة في الخطة
            <select
              value={form.weight}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, weight: Number(event.target.value) }))
              }
            >
              {importanceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="muted">
              تستخدم هذه الأولوية لتوزيع المحاضرات بين المواد، بحيث تظهر المواد ذات الأولوية المرتفعة أكثر في الخطة.
            </p>
          </label>
          <label>
            ملاحظات اختيارية
            <textarea
              value={form.notes ?? ''}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              placeholder="أضف ملاحظات تساعدك على المذاكرة"
            />
          </label>
          <div className="study-form__actions">
            <button type="button" className="study-button secondary" onClick={onCancel}>
              إلغاء
            </button>
            <button type="submit" className="study-button">
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
