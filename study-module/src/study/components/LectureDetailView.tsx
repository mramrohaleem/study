import { useState } from 'react';
import { SectionView } from '../StudySection';
import { useStudyActions, useStudyState } from '../state';
import { getLectureStatusLabel } from '../utils/selectors';
import { LectureForm, LectureFormValues } from './LectureForm';
import { LectureType, LecturePriority } from '../types';

interface LectureDetailViewProps {
  lectureId: string;
  onNavigate: (view: SectionView) => void;
}

export const LectureDetailView: React.FC<LectureDetailViewProps> = ({ lectureId, onNavigate }) => {
  const state = useStudyState();
  const actions = useStudyActions();
  const [showForm, setShowForm] = useState(false);

  const lecture = state.lectures.find((item) => item.id === lectureId);
  if (!lecture) {
    return (
      <div className="lecture-detail">
        <button className="link-button" onClick={() => onNavigate({ type: 'dashboard' })}>
          ← العودة إلى لوحة التحكم
        </button>
        <p>لم يتم العثور على الدرس.</p>
      </div>
    );
  }

  const subject = state.subjects.find((item) => item.id === lecture.subjectId);
  const typeLabel: Record<LectureType, string> = {
    lecture: 'محاضرة',
    section: 'سكشن',
    mcq: 'أسئلة اختيار من متعدد',
    case: 'حالة',
    other: 'أخرى',
  };
  const priorityLabel: Record<LecturePriority, string> = {
    low: 'منخفضة',
    normal: 'عادية',
    high: 'مرتفعة',
  };

  const handleStatus = (status: 'done' | 'needs_revision' | 'not_started') => {
    actions.markLectureStatus(lectureId, status);
  };

  const handleSubmit = (values: LectureFormValues) => {
    actions.updateLecture(lectureId, {
      title: values.title,
      estimatedMinutes: values.estimatedMinutes,
      type: values.type,
      priority: values.priority,
      tags: values.tags,
      sourceLink: values.sourceLink,
    });
    setShowForm(false);
  };

  return (
    <div className="lecture-detail">
      <button className="link-button" onClick={() => onNavigate({ type: 'subject', subjectId: lecture.subjectId })}>
        ← العودة إلى المادة
      </button>
      <header className="lecture-header" style={{ borderColor: subject?.color ?? '#4c6ef5' }}>
        <div>
          <span className="badge" style={{ background: subject?.color ?? '#4c6ef5', color: 'white' }}>
            {subject?.name ?? 'المادة'}
          </span>
          <h1>{lecture.title}</h1>
          <p className="muted">
            {getLectureStatusLabel(lecture.status)} · {lecture.estimatedMinutes} دقيقة · {typeLabel[lecture.type]}
          </p>
        </div>
        <div className="lecture-header__actions">
          <button className="study-button secondary" onClick={() => setShowForm(true)}>
            تعديل الدرس
          </button>
          <button className="study-button" onClick={() => onNavigate({ type: 'focus', lectureId })}>
            بدء جلسة تركيز
          </button>
        </div>
      </header>

      <section className="lecture-meta">
        <div>
          <span className="muted">الترتيب</span>
          <h3>#{lecture.order}</h3>
        </div>
        <div>
          <span className="muted">الأولوية</span>
          <h3>{lecture.priority ? priorityLabel[lecture.priority] : 'عادية'}</h3>
        </div>
        <div>
          <span className="muted">الوسوم</span>
          <div className="tag-row">
            {lecture.tags.length ? (
              lecture.tags.map((tag) => (
                <span key={tag} className="tag">
                  {tag}
                </span>
              ))
            ) : (
              <span className="muted">لا توجد وسوم</span>
            )}
          </div>
        </div>
      </section>

      {lecture.sourceLink && (
        <a className="study-button secondary" href={lecture.sourceLink} target="_blank" rel="noreferrer">
          فتح المادة المرجعية
        </a>
      )}

      <section className="lecture-actions">
        <h3>تحديث الحالة</h3>
        <div className="lecture-buttons">
          <button className="study-button" onClick={() => handleStatus('done')}>
            تحديد كمنتهية
          </button>
          <button className="study-button secondary" onClick={() => handleStatus('needs_revision')}>
            تحتاج مراجعة
          </button>
          <button className="study-button secondary" onClick={() => handleStatus('not_started')}>
            إعادة التعيين
          </button>
        </div>
      </section>

      {showForm && (
        <LectureForm
          title="تعديل الدرس"
          submitLabel="حفظ التعديلات"
          initial={{
            title: lecture.title,
            estimatedMinutes: lecture.estimatedMinutes,
            type: lecture.type,
            priority: lecture.priority ?? 'normal',
            tags: lecture.tags,
            sourceLink: lecture.sourceLink,
          }}
          onCancel={() => setShowForm(false)}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
};
