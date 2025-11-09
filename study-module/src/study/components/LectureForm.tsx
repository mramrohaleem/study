import { useState } from 'react';
import { LecturePriority, LectureType } from '../types';

export interface LectureFormValues {
  title: string;
  type: LectureType;
  estimatedMinutes: number;
  priority: LecturePriority;
  tags: string[];
  sourceLink?: string;
}

interface LectureFormProps {
  initial?: Partial<LectureFormValues> & { title?: string };
  onCancel: () => void;
  onSubmit: (values: LectureFormValues) => void;
  title: string;
  submitLabel?: string;
}

export const LectureForm: React.FC<LectureFormProps> = ({
  initial,
  onCancel,
  onSubmit,
  title,
  submitLabel = 'حفظ المحاضرة',
}) => {
  const [form, setForm] = useState<LectureFormValues>({
    title: initial?.title ?? '',
    type: (initial?.type as LectureType) ?? 'lecture',
    estimatedMinutes: initial?.estimatedMinutes ?? 45,
    priority: (initial?.priority as LecturePriority) ?? 'normal',
    tags: initial?.tags ?? [],
    sourceLink: initial?.sourceLink,
  });

  const [tagsInput, setTagsInput] = useState(form.tags.join(', '));

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim()) {
      return;
    }
    const tags = tagsInput
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
    onSubmit({ ...form, title: form.title.trim(), tags, sourceLink: form.sourceLink?.trim() || undefined });
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
            عنوان الدرس
            <input
              type="text"
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="يمكنك كتابة العنوان بأي لغة"
              required
            />
          </label>
          <label>
            النوع
            <select
              value={form.type}
              onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as LectureType }))}
            >
              <option value="lecture">محاضرة</option>
              <option value="section">سكشن</option>
              <option value="mcq">أسئلة اختيار من متعدد</option>
              <option value="case">حالة</option>
              <option value="other">أخرى</option>
            </select>
          </label>
          <label>
            الوقت التقديري (بالدقائق)
            <input
              type="number"
              min={5}
              value={form.estimatedMinutes}
              onChange={(event) => setForm((prev) => ({ ...prev, estimatedMinutes: Number(event.target.value) }))}
            />
          </label>
          <label>
            الأولوية
            <select
              value={form.priority}
              onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value as LecturePriority }))}
            >
              <option value="low">منخفضة</option>
              <option value="normal">عادية</option>
              <option value="high">مرتفعة</option>
            </select>
          </label>
          <label>
            الوسوم (افصل بينها بفواصل)
            <input
              type="text"
              value={tagsInput}
              onChange={(event) => setTagsInput(event.target.value)}
              placeholder="مثال: تشريح, فصل أول"
            />
          </label>
          <label>
            رابط المصدر (اختياري)
            <input
              type="url"
              value={form.sourceLink ?? ''}
              onChange={(event) => setForm((prev) => ({ ...prev, sourceLink: event.target.value }))}
              placeholder="https://"
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
