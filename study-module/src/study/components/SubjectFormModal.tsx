import { FormEvent, useEffect, useState } from 'react';
import { Difficulty, Subject } from '../types';

interface SubjectFormValues {
  name: string;
  color: string;
  examDate: string;
  difficulty: Difficulty;
  reservedRevisionDays: number;
  weight: number;
  notes?: string;
}

interface SubjectFormModalProps {
  isOpen: boolean;
  initialSubject?: Subject;
  onClose: () => void;
  onSubmit: (values: SubjectFormValues) => void;
}

const defaultValues: SubjectFormValues = {
  name: '',
  color: '#4c6ef5',
  examDate: '',
  difficulty: 'medium',
  reservedRevisionDays: 3,
  weight: 1,
  notes: '',
};

export const SubjectFormModal: React.FC<SubjectFormModalProps> = ({ isOpen, initialSubject, onClose, onSubmit }) => {
  const [values, setValues] = useState<SubjectFormValues>(defaultValues);

  useEffect(() => {
    if (!isOpen) return;
    if (initialSubject) {
      setValues({
        name: initialSubject.name,
        color: initialSubject.color,
        examDate: initialSubject.examDate,
        difficulty: initialSubject.difficulty,
        reservedRevisionDays: initialSubject.reservedRevisionDays,
        weight: initialSubject.weight,
        notes: initialSubject.notes ?? '',
      });
    } else {
      setValues({
        ...defaultValues,
        examDate: new Date().toISOString().slice(0, 10),
      });
    }
  }, [isOpen, initialSubject]);

  if (!isOpen) return null;

  const handleChange = <K extends keyof SubjectFormValues>(key: K, value: SubjectFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit({
      ...values,
      name: values.name.trim() || 'مادة بدون اسم',
      reservedRevisionDays: Number(values.reservedRevisionDays) || 0,
      weight: Number(values.weight) || 1,
    });
    onClose();
  };

  return (
    <div className="modal-overlay">
      <form className="modal" onSubmit={handleSubmit}>
        <header className="modal__header">
          <h2>{initialSubject ? 'تعديل المادة' : 'إضافة مادة جديدة'}</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="إغلاق">
            ×
          </button>
        </header>
        <div className="modal__body form-grid">
          <label>
            اسم المادة
            <input
              type="text"
              value={values.name}
              onChange={(event) => handleChange('name', event.target.value)}
              placeholder="مثال: علم السموم الجنائي"
              required
            />
          </label>
          <label>
            لون التمييز
            <input
              type="color"
              value={values.color}
              onChange={(event) => handleChange('color', event.target.value)}
            />
          </label>
          <label>
            تاريخ الاختبار
            <input
              type="date"
              value={values.examDate}
              onChange={(event) => handleChange('examDate', event.target.value)}
              required
            />
          </label>
          <label>
            مستوى الصعوبة
            <select
              value={values.difficulty}
              onChange={(event) => handleChange('difficulty', event.target.value as Difficulty)}
            >
              <option value="easy">سهل</option>
              <option value="medium">متوسط</option>
              <option value="hard">صعب</option>
            </select>
          </label>
          <label>
            أيام المراجعة المحجوزة قبل الاختبار
            <input
              type="number"
              min={0}
              value={values.reservedRevisionDays}
              onChange={(event) => handleChange('reservedRevisionDays', Number(event.target.value))}
            />
          </label>
          <label>
            الوزن (الأهمية)
            <input
              type="number"
              min={0.5}
              step={0.1}
              value={values.weight}
              onChange={(event) => handleChange('weight', Number(event.target.value))}
            />
          </label>
          <label className="form-grid__full">
            ملاحظات إضافية
            <textarea
              value={values.notes}
              onChange={(event) => handleChange('notes', event.target.value)}
              placeholder="اكتب أي ملاحظات تريد تذكرها لهذه المادة"
              rows={3}
            />
          </label>
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
