import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { SectionView } from '../StudySection';
import { useStudyActions, useStudyState } from '../state';
import { RevisionPass } from '../types';

interface RevisionPlannerViewProps {
  subjectId?: string;
  onNavigate: (view: SectionView) => void;
}

interface RevisionForm {
  name: string;
  trigger: 'after_finish' | 'before_exam';
  offsetDaysBeforeExam?: number;
  includeStatuses: ('done' | 'needs_revision')[];
  includeTags: string[];
  spreadOverDays?: number;
}

const defaultForm: RevisionForm = {
  name: 'موجة مراجعة',
  trigger: 'after_finish',
  includeStatuses: ['done', 'needs_revision'],
  includeTags: [],
  spreadOverDays: 3,
};

const statusLabel: Record<'done' | 'needs_revision', string> = {
  done: 'مكتملة',
  needs_revision: 'بحاجة لمراجعة',
};

export const RevisionPlannerView: React.FC<RevisionPlannerViewProps> = ({ subjectId, onNavigate }) => {
  const state = useStudyState();
  const actions = useStudyActions();
  const [selectedSubjectId, setSelectedSubjectId] = useState(subjectId ?? state.subjects[0]?.id ?? '');
  const [form, setForm] = useState<RevisionForm>(defaultForm);
  const [message, setMessage] = useState<string | null>(null);

  const subject = state.subjects.find((item) => item.id === selectedSubjectId);
  const revisionPasses = subject?.revisionPasses ?? [];

  const upcomingRevision = useMemo(() => {
    return state.studyDays
      .map((day) => ({
        date: day.date,
        items: day.targetLectures.filter((item) => item.isRevision && item.subjectId === selectedSubjectId),
      }))
      .filter((day) => day.items.length > 0)
      .slice(0, 7);
  }, [state.studyDays, selectedSubjectId]);

  const scheduleRevisionPass = (pass: RevisionPass) => {
    if (!subject) return;
    const lectures = state.lectures.filter((lecture) => lecture.subjectId === subject.id);
    const eligibleStatuses = pass.includeStatuses ?? ['needs_revision', 'done'];
    const filtered = lectures.filter((lecture) => {
      const matchesStatus = eligibleStatuses.includes(lecture.status as 'done' | 'needs_revision');
      const matchesTags = pass.includeTags && pass.includeTags.length > 0 ? pass.includeTags.some((tag) => lecture.tags.includes(tag)) : true;
      return matchesStatus && matchesTags;
    });
    if (!filtered.length) {
      setMessage('لا توجد محاضرات مطابقة لشروط هذه المراجعة حتى الآن.');
      return;
    }

    const startDate = pass.trigger === 'after_finish'
      ? dayjs().add(1, 'day')
      : dayjs(subject.examDate).subtract(pass.offsetDaysBeforeExam ?? 3, 'day');
    const spreadDays = pass.spreadOverDays ?? Math.min(filtered.length, 3);
    let cursor = startDate.startOf('day');

    filtered.forEach((lecture, index) => {
      const dayOffset = index % spreadDays;
      const targetDate = cursor.add(dayOffset, 'day').format('YYYY-MM-DD');
      const planned = {
        subjectId: subject.id,
        lectureId: lecture.id,
        block: `revision-${dayOffset + 1}`,
        isRevision: true,
      } as const;
      actions.assignLectureToDay(targetDate, planned, Math.max(lecture.estimatedMinutes / 2, 20));
    });
    setMessage(`تم جدولة مهام المراجعة على مدى ${spreadDays} يوم/أيام ابتداءً من ${startDate.format('YYYY/MM/DD')}.`);
  };

  const handleAddPass = () => {
    if (!selectedSubjectId) return;
    actions.addRevisionPass(selectedSubjectId, {
      name: form.name,
      trigger: form.trigger,
      offsetDaysBeforeExam: form.trigger === 'before_exam' ? form.offsetDaysBeforeExam ?? 7 : undefined,
      includeTags: form.includeTags,
      includeStatuses: form.includeStatuses,
      spreadOverDays: form.spreadOverDays,
    });
    setForm(defaultForm);
    setMessage('تم حفظ إعدادات المراجعة.');
  };

  if (!subject) {
    return (
      <div className="revision-planner">
        <button className="link-button" onClick={() => onNavigate({ type: 'dashboard' })}>
          ← العودة إلى اللوحة
        </button>
        <p>أضف مادة أولًا لإنشاء خطة مراجعة.</p>
      </div>
    );
  }

  return (
    <div className="revision-planner">
      <button className="link-button" onClick={() => onNavigate({ type: 'subject', subjectId: selectedSubjectId })}>
        ← الرجوع إلى المادة
      </button>
      <header className="revision-header">
        <div>
          <h1>مخطط المراجعات</h1>
          <p className="muted">صمّم موجات مراجعة توزع المهام قبل موعد الاختبار.</p>
        </div>
        <select value={selectedSubjectId} onChange={(event) => setSelectedSubjectId(event.target.value)}>
          {state.subjects.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </header>

      <section className="revision-form">
        <h3>إضافة موجة مراجعة</h3>
        <div className="revision-grid">
          <label>
            اسم الموجة
            <input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
          </label>
          <label>
            وقت التفعيل
            <select
              value={form.trigger}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, trigger: event.target.value as 'after_finish' | 'before_exam' }))
              }
            >
              <option value="after_finish">بعد الانتهاء من المحاضرات</option>
              <option value="before_exam">أيام قبل الاختبار</option>
            </select>
          </label>
          {form.trigger === 'before_exam' && (
            <label>
              عدد الأيام قبل الاختبار
              <input
                type="number"
                min={1}
                value={form.offsetDaysBeforeExam ?? 7}
                onChange={(event) => setForm((prev) => ({ ...prev, offsetDaysBeforeExam: Number(event.target.value) }))}
              />
            </label>
          )}
          <label>
            الحالات المضمنة
            <select
              multiple
              value={form.includeStatuses}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  includeStatuses: Array.from(event.target.selectedOptions).map((option) => option.value as 'done' | 'needs_revision'),
                }))
              }
            >
              <option value="done">مكتملة</option>
              <option value="needs_revision">بحاجة لمراجعة</option>
            </select>
          </label>
          <label>
            الوسوم (افصلها بفاصلة)
            <input
              value={form.includeTags.join(', ')}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  includeTags: event.target.value
                    .split(',')
                    .map((tag) => tag.trim())
                    .filter(Boolean),
                }))
              }
              placeholder="مثال: عالي الأهمية, يحتاج مراجعة"
            />
          </label>
          <label>
            التوزيع على عدد الأيام
            <input
              type="number"
              min={1}
              value={form.spreadOverDays ?? 3}
              onChange={(event) => setForm((prev) => ({ ...prev, spreadOverDays: Number(event.target.value) }))}
            />
          </label>
        </div>
        <div className="revision-form__actions">
          <button className="study-button" onClick={handleAddPass}>
            حفظ الموجة
          </button>
          {revisionPasses.length > 0 && (
            <button
              className="study-button secondary"
              onClick={() => revisionPasses.forEach((pass) => scheduleRevisionPass(pass))}
            >
              جدولة جميع المراجعات الآن
            </button>
          )}
        </div>
        {message && <p className="planner-info">{message}</p>}
      </section>

      <section className="revision-pass-list">
        <h3>الموجات المعرفة</h3>
        {revisionPasses.length === 0 && <p className="muted">لم تتم إضافة موجات مراجعة بعد.</p>}
        <div className="revision-pass-grid">
          {revisionPasses.map((pass) => (
            <article key={pass.id} className="revision-pass-card">
              <h4>{pass.name}</h4>
              <p className="muted">
                {pass.trigger === 'after_finish'
                  ? 'بعد إكمال جميع المحاضرات'
                  : `${pass.offsetDaysBeforeExam} يوم قبل الاختبار`}
              </p>
              <p className="muted">
                الحالات المشمولة: {(pass.includeStatuses ?? ['done', 'needs_revision'])
                  .map((status) => statusLabel[status])
                  .join(', ')}
              </p>
              {pass.includeTags && pass.includeTags.length > 0 && (
                <p className="muted">الوسوم: {pass.includeTags.join(', ')}</p>
              )}
              <p className="muted">التوزيع على {pass.spreadOverDays ?? 3} يوم/أيام</p>
              <div className="lecture-buttons">
                <button className="study-button secondary" onClick={() => scheduleRevisionPass(pass)}>
                  جدولة الآن
                </button>
                <button className="study-button secondary" onClick={() => actions.deleteRevisionPass(pass.id)}>
                  حذف
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="revision-upcoming">
        <h3>مهام المراجعة القادمة</h3>
        {upcomingRevision.length === 0 && <p className="muted">لا توجد مهام مراجعة مجدولة.</p>}
        <div className="revision-upcoming__list">
          {upcomingRevision.map((day) => (
            <div key={day.date} className="revision-upcoming__item">
              <strong>{dayjs(day.date).format('YYYY/MM/DD')}</strong>
              <span>{day.items.length} مهمة</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
