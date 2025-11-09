import { useState } from 'react';
import { useStudyActions, useStudyState } from '../state';
import { LectureType } from '../types';

interface BulkLectureFormProps {
  subjectId: string;
  onCancel: () => void;
  onDone: () => void;
}

export const BulkLectureForm: React.FC<BulkLectureFormProps> = ({
  subjectId,
  onCancel,
  onDone,
}) => {
  const actions = useStudyActions();
  const state = useStudyState();
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const lines = input
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      setError('أضف سطرًا واحدًا على الأقل يحتوي على درس واحد.');
      return;
    }

    let createdCount = 0;
    let nextOrder =
      state.lectures.filter((lecture) => lecture.subjectId === subjectId).length + 1;

    for (const line of lines) {
      const parts = line.split('|').map((part) => part.trim());
      if (!parts[0]) {
        continue;
      }

      const title = parts[0];

      const minutesRaw = parts[1] ?? '';
      const estimatedMinutes = minutesRaw ? Number(minutesRaw) || 45 : 45;

      const typeRaw = (parts[2] ?? '').toLowerCase();
      const allowedTypes: LectureType[] = ['lecture', 'section', 'mcq', 'case', 'other'];
      const type: LectureType = allowedTypes.includes(typeRaw as LectureType)
        ? (typeRaw as LectureType)
        : 'lecture';

      const tagsRaw = parts[3] ?? '';
      const tags = tagsRaw
        ? tagsRaw
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [];

      actions.upsertLecture({
        subjectId,
        title,
        estimatedMinutes,
        type,
        priority: 'normal',
        tags,
        order: nextOrder,
      });

      createdCount += 1;
      nextOrder += 1;
    }

    if (createdCount === 0) {
      setError('لم يتم التعرف على أي دروس. تأكد من صيغة السطور.');
      return;
    }

    onDone();
  };

  return (
    <div className="study-modal">
      <div className="study-modal__content">
        <div className="study-modal__header">
          <h2>إضافة مجموعة دروس</h2>
          <button className="icon-button" onClick={onCancel} aria-label="إغلاق">
            ×
          </button>
        </div>
        <form className="study-form" onSubmit={handleSubmit}>
          <label>
            اكتب كل درس في سطر
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={
                'الصيغة المقترحة:\n' +
                'العنوان | الدقائق | النوع | وسوم\n\n' +
                'أمثلة:\n' +
                'محاضرة 1 | 45 | lecture | تشريح, فصل 1\n' +
                'سكشن 1 | 30 | section\n'
              }
            />
          </label>
          <p className="muted">
            الحقول بعد العنوان اختيارية. إذا لم تكتب الدقائق فسيتم استخدام 45 دقيقة افتراضيًا.
          </p>
          {error && <p className="planner-warning">{error}</p>}
          <div className="study-form__actions">
            <button type="button" className="study-button secondary" onClick={onCancel}>
              إلغاء
            </button>
            <button type="submit" className="study-button">
              حفظ الدروس
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
