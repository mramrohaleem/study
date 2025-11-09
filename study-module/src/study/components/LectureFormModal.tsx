import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Lecture, LecturePriority, LectureType } from '../types';

interface LectureFormValues {
  subjectId: string;
  title: string;
  type: LectureType;
  estimatedMinutes: number;
  priority: LecturePriority;
  tags: string[];
  sourceLink?: string;
  planToDay?: string;
  planBlock?: string;
}

interface LectureFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: LectureFormValues) => string | void;
  subjectOptions: { id: string; name: string }[];
  initialLecture?: Lecture;
  defaultSubjectId?: string;
  lockSubject?: boolean;
  allowPlanning?: boolean;
  defaultPlanDate?: string;
  defaultPlanBlock?: string;
}

const defaultLectureValues: Omit<LectureFormValues, 'subjectId'> = {
  title: '',
  type: 'lecture',
  estimatedMinutes: 45,
  priority: 'normal',
  tags: [],
  sourceLink: '',
};

export const LectureFormModal: React.FC<LectureFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  subjectOptions,
  initialLecture,
  defaultSubjectId,
  lockSubject,
  allowPlanning,
  defaultPlanDate,
  defaultPlanBlock = 'morning',
}) => {
  const initialSubjectId = useMemo(() => {
    if (initialLecture) return initialLecture.subjectId;
    if (defaultSubjectId) return defaultSubjectId;
    return subjectOptions[0]?.id ?? '';
  }, [initialLecture, defaultSubjectId, subjectOptions]);

  const [subjectId, setSubjectId] = useState(initialSubjectId);
  const [values, setValues] = useState<Omit<LectureFormValues, 'subjectId'>>({ ...defaultLectureValues });
  const [planEnabled, setPlanEnabled] = useState(Boolean(defaultPlanDate));
  const [planDate, setPlanDate] = useState(defaultPlanDate ?? '');
  const [planBlock, setPlanBlock] = useState(defaultPlanBlock);

  useEffect(() => {
    if (!isOpen) return;
    setSubjectId(initialSubjectId);
    if (initialLecture) {
      setValues({
        title: initialLecture.title,
        type: initialLecture.type,
        estimatedMinutes: initialLecture.estimatedMinutes,
        priority: initialLecture.priority ?? 'normal',
        tags: initialLecture.tags,
        sourceLink: initialLecture.sourceLink ?? '',
      });
    } else {
      setValues({ ...defaultLectureValues });
    }
    setPlanEnabled(Boolean(defaultPlanDate));
    setPlanDate(defaultPlanDate ?? '');
    setPlanBlock(defaultPlanBlock);
  }, [isOpen, initialLecture, initialSubjectId, defaultPlanDate, defaultPlanBlock]);

  if (!isOpen) return null;

  const handleChange = <K extends keyof typeof values>(key: K, value: (typeof values)[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = values.title.trim();
    if (!subjectId) return;
    const submission: LectureFormValues = {
      subjectId,
      title: trimmedTitle || 'محاضرة بدون عنوان',
      type: values.type,
      estimatedMinutes: Number(values.estimatedMinutes) || 30,
      priority: values.priority,
      tags: values.tags.map((tag) => tag.trim()).filter(Boolean),
      sourceLink: values.sourceLink?.trim() || undefined,
      planToDay: allowPlanning && planEnabled && planDate ? planDate : undefined,
      planBlock: allowPlanning && planEnabled && planDate ? planBlock : undefined,
    };
    onSubmit(submission);
    onClose();
  };

  const tagInput = values.tags.join(', ');

  return (
    <div className="modal-overlay">
      <form className="modal" onSubmit={handleSubmit}>
        <header className="modal__header">
          <h2>{initialLecture ? 'تعديل المحاضرة' : 'إضافة محاضرة'}</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="إغلاق">
            ×
          </button>
        </header>
        <div className="modal__body form-grid">
          {!lockSubject && (
            <label className="form-grid__full">
              اختر المادة
              <select value={subjectId} onChange={(event) => setSubjectId(event.target.value)} required>
                <option value="">اختر المادة</option>
                {subjectOptions.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {lockSubject && (
            <div className="form-grid__full locked-field">
              <span>المادة</span>
              <strong>{subjectOptions.find((option) => option.id === subjectId)?.name ?? '—'}</strong>
            </div>
          )}
          <label className="form-grid__full">
            عنوان المحاضرة
            <input
              type="text"
              value={values.title}
              onChange={(event) => handleChange('title', event.target.value)}
              placeholder="اكتب عنوان المحاضرة"
              required
            />
          </label>
          <label>
            نوع المحتوى
            <select
              value={values.type}
              onChange={(event) => handleChange('type', event.target.value as LectureType)}
            >
              <option value="lecture">محاضرة</option>
              <option value="section">قسم عملي</option>
              <option value="mcq">أسئلة اختيار من متعدد</option>
              <option value="case">حالة سريرية</option>
              <option value="other">أخرى</option>
            </select>
          </label>
          <label>
            الدقائق المتوقعة
            <input
              type="number"
              min={5}
              value={values.estimatedMinutes}
              onChange={(event) => handleChange('estimatedMinutes', Number(event.target.value))}
            />
          </label>
          <label>
            الأولوية
            <select
              value={values.priority}
              onChange={(event) => handleChange('priority', event.target.value as LecturePriority)}
            >
              <option value="low">منخفضة</option>
              <option value="normal">متوسطة</option>
              <option value="high">مرتفعة</option>
            </select>
          </label>
          <label>
            رابط المصدر (اختياري)
            <input
              type="url"
              value={values.sourceLink}
              onChange={(event) => handleChange('sourceLink', event.target.value)}
              placeholder="رابط الفيديو أو الملف"
            />
          </label>
          <label className="form-grid__full">
            الوسوم (افصل بينها بفاصلة)
            <input
              type="text"
              value={tagInput}
              onChange={(event) =>
                handleChange(
                  'tags',
                  event.target.value
                    .split(',')
                    .map((tag) => tag.trim())
                )
              }
              placeholder="مثال: عالي الأهمية, يحتاج مراجعة"
            />
          </label>
          {allowPlanning && (
            <div className="form-grid__full planning-options">
              <label className="checkbox-inline">
                <input
                  type="checkbox"
                  checked={planEnabled}
                  onChange={(event) => setPlanEnabled(event.target.checked)}
                />
                <span>إضافة هذه المحاضرة لخطة يوم محدد</span>
              </label>
              {planEnabled && (
                <div className="plan-grid">
                  <label>
                    التاريخ
                    <input
                      type="date"
                      value={planDate}
                      onChange={(event) => setPlanDate(event.target.value)}
                      required
                    />
                  </label>
                  <label>
                    الفترة
                    <select value={planBlock} onChange={(event) => setPlanBlock(event.target.value)}>
                      <option value="morning">الصباح</option>
                      <option value="afternoon">بعد الظهر</option>
                      <option value="evening">المساء</option>
                    </select>
                  </label>
                </div>
              )}
            </div>
          )}
        </div>
        <footer className="modal__footer">
          <button type="button" className="study-button secondary" onClick={onClose}>
            إلغاء
          </button>
          <button type="submit" className="study-button">
            حفظ
          </button>
        </footer>
      </form>
    </div>
  );
};
