import { useState } from 'react';
import { SectionView } from '../StudySection';
import { useStudyActions, useStudyState } from '../state';
import { getLectureStatusLabel } from '../utils/selectors';
import { LectureFormModal } from './LectureFormModal';

interface LectureDetailViewProps {
  lectureId: string;
  onNavigate: (view: SectionView) => void;
}

export const LectureDetailView: React.FC<LectureDetailViewProps> = ({ lectureId, onNavigate }) => {
  const state = useStudyState();
  const actions = useStudyActions();
  const [editOpen, setEditOpen] = useState(false);
  const priorityLabel: Record<string, string> = {
    low: 'منخفضة',
    normal: 'متوسطة',
    high: 'مرتفعة',
  };

  const lecture = state.lectures.find((item) => item.id === lectureId);
  if (!lecture) {
    return (
      <div className="lecture-detail">
        <button className="link-button" onClick={() => onNavigate({ type: 'dashboard' })}>
          ← العودة إلى اللوحة
        </button>
        <p>لم يتم العثور على هذه المحاضرة.</p>
      </div>
    );
  }

  const subject = state.subjects.find((item) => item.id === lecture.subjectId);

  return (
    <div className="lecture-detail">
      <button className="link-button" onClick={() => onNavigate({ type: 'subject', subjectId: lecture.subjectId })}>
        ← الرجوع إلى المادة
      </button>
      <header className="lecture-header" style={{ borderColor: subject?.color ?? '#4c6ef5' }}>
        <div>
          <span className="badge" style={{ background: subject?.color ?? '#4c6ef5', color: '#fff' }}>
            {subject?.name ?? 'مادة غير معروفة'}
          </span>
          <h1>{lecture.title}</h1>
          <p className="muted">
            {getLectureStatusLabel(lecture.status)} · {lecture.estimatedMinutes} دقيقة · {lecture.type}
          </p>
        </div>
        <div className="lecture-detail__actions">
          <button className="study-button secondary" onClick={() => setEditOpen(true)}>
            تعديل المحاضرة
          </button>
          <button className="study-button" onClick={() => onNavigate({ type: 'focus', lectureId })}>
            ابدأ جلسة تركيز
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
          <h3>{priorityLabel[lecture.priority ?? 'normal'] ?? 'متوسطة'}</h3>
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
          فتح المصدر التعليمي
        </a>
      )}

      <section className="lecture-actions">
        <h3>تحديث حالة المحاضرة</h3>
        <div className="lecture-buttons">
          <button className="study-button" onClick={() => actions.markLectureStatus(lectureId, 'done')}>
            علامة كمكتملة
          </button>
          <button className="study-button secondary" onClick={() => actions.markLectureStatus(lectureId, 'needs_revision')}>
            بحاجة لمراجعة
          </button>
          <button className="study-button secondary" onClick={() => actions.markLectureStatus(lectureId, 'not_started')}>
            إعادة الحالة للبداية
          </button>
        </div>
      </section>

      <LectureFormModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        initialLecture={lecture}
        subjectOptions={[{ id: lecture.subjectId, name: subject?.name ?? 'المادة' }]}
        defaultSubjectId={lecture.subjectId}
        lockSubject
        onSubmit={(values) => {
          actions.updateLecture(lectureId, {
            title: values.title,
            type: values.type,
            estimatedMinutes: values.estimatedMinutes,
            priority: values.priority,
            tags: values.tags,
            sourceLink: values.sourceLink,
          });
          setEditOpen(false);
          return lectureId;
        }}
      />
    </div>
  );
};
