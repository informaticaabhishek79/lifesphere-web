'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { AlarmClock, Check, Pencil, RotateCcw, Trash2, UserPlus, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { useHouseholds, usePeople, useTaskCategories } from '@/lib/data';
import { useSession } from '@/lib/session';
import type { Task, TaskDetail } from '@/lib/types';
import { useI18n } from '@/i18n';
import { Badge, Button, Card, CardBody, CardHeader, ErrorNotice, IconButton, KeyValue, LoadingBlock, PageHeader } from '@/components/ui';
import { Select } from '@/components/form';
import { FormDialog, useConfirm } from '@/components/dialog';
import { PriorityBadge, StatusBadge } from '@/components/status';
import { AttachmentList, UploadButton } from '@/components/attachments';
import { formToUpdate, TaskFields, taskToForm, type TaskFormValue } from '@/components/task-form';
import { ReminderDialog } from '@/components/reminder-dialog';

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, e } = useI18n();
  const { fmt, me } = useSession();
  const router = useRouter();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const key = ['task', id];
  const q = useQuery({ queryKey: key, queryFn: () => api.get<TaskDetail>(`/v1/tasks/${id}`) });
  const households = useHouseholds();
  const categories = useTaskCategories();
  const { others } = usePeople();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<TaskFormValue | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignee, setAssignee] = useState('');
  const [reminderOpen, setReminderOpen] = useState(false);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: key });
    qc.invalidateQueries({ queryKey: ['tasks'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };
  const toggle = useAction(() => (task?.status === 'completed' ? api.post(`/v1/tasks/${id}/reopen`) : api.post(`/v1/tasks/${id}/complete`)), { onSuccess: refresh });
  const unassign = useAction((userId: string) => api.del(`/v1/tasks/${id}/assignments/${userId}`), { onSuccess: refresh });
  const detach = useAction((attachmentId: string) => api.del(`/v1/tasks/${id}/attachments/${attachmentId}`), { onSuccess: refresh });

  if (q.isLoading) return <LoadingBlock rows={4} />;
  if (q.error || !q.data) return <ErrorNotice error={q.error} onRetry={q.refetch} />;
  const task = q.data;
  const done = task.status === 'completed';
  const household = households.data?.find((h) => h.id === task.householdId);
  const category = categories.data?.find((c) => c.id === task.categoryId);

  return (
    <div className="max-w-3xl">
      <PageHeader
        back={{ href: '/tasks', label: t('nav.tasks') }}
        title={<span className={done ? 'text-muted line-through' : undefined}>{task.title}</span>}
        actions={
          <>
            <Button variant={done ? 'secondary' : 'primary'} icon={done ? <RotateCcw className="size-4" /> : <Check className="size-4" />} loading={toggle.isPending} onClick={() => toggle.mutate()}>
              {done ? t('tasks.markNotDone') : t('tasks.markDone')}
            </Button>
            {task.canEdit && (
              <Button
                variant="secondary"
                icon={<Pencil className="size-4" />}
                onClick={() => {
                  setForm(taskToForm(task));
                  setEditing(true);
                }}
              >
                {t('common.edit')}
              </Button>
            )}
          </>
        }
      />

      <div className="space-y-5">
        <Card>
          <CardBody className="space-y-4 pt-5">
            <div className="flex flex-wrap gap-2">
              <StatusBadge group="taskStatus" value={task.status} />
              <PriorityBadge value={task.priority} />
              {task.overdue && !done && <Badge tone="danger">{t('common.overdue')}</Badge>}
              <Badge tone={task.visibility === 'shared' ? 'accent' : 'neutral'}>{e('taskVisibility', task.visibility)}</Badge>
              {task.isChore && <Badge>{t('tasks.chore')}</Badge>}
            </div>
            {task.notes && <p className="whitespace-pre-wrap text-ink-2">{task.notes}</p>}
            <KeyValue
              items={[
                { label: t('tasks.due'), value: task.dueAt ? (task.allDay ? fmt.date(task.dueAt) : fmt.dateTime(task.dueAt)) : t('common.noDate') },
                { label: t('tasks.repeat'), value: task.recurrenceRule },
                { label: t('tasks.belongsTo'), value: household?.name ?? t('common.personal') },
                { label: t('common.category'), value: category?.name },
                { label: t('tasks.completedAt'), value: task.completedAt ? fmt.dateTime(task.completedAt) : undefined },
              ]}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title={t('tasks.people')}
            description={t('tasks.offerToHint')}
            action={
              task.canEdit && others.length > 0 ? (
                <Button size="sm" variant="secondary" icon={<UserPlus className="size-4" />} onClick={() => setAssignOpen(true)}>
                  {t('tasks.offer')}
                </Button>
              ) : undefined
            }
          />
          <CardBody>
            {task.assignments.length === 0 ? (
              <p className="text-sm text-muted">{t('tasks.noAssignees')}</p>
            ) : (
              <ul className="divide-y divide-line">
                {task.assignments.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 py-2.5">
                    <span className="flex-1 font-medium">{a.userId === me.id ? t('common.you') : a.displayName}</span>
                    <StatusBadge group="assignmentStatus" value={a.status} />
                    {task.canEdit && (
                      <IconButton label={t('common.remove')} onClick={() => unassign.mutate(a.userId)}>
                        <X className="size-4" />
                      </IconButton>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            icon={<AlarmClock className="size-5" />}
            title={t('nav.reminders')}
            action={
              <Button size="sm" variant="secondary" onClick={() => setReminderOpen(true)}>
                {t('common.add')}
              </Button>
            }
          />
          <CardBody>
            {task.reminders.length === 0 ? (
              <p className="text-sm text-muted">{t('dashboard.noReminders')}</p>
            ) : (
              <ul className="divide-y divide-line">
                {task.reminders.map((r) => (
                  <li key={r.id} className="flex items-center justify-between py-2.5">
                    <span>{fmt.dateTime(r.fireAt)}</span>
                    <StatusBadge group="reminderStatus" value={r.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title={t('tasks.attachments')}
            action={
              task.canEdit ? (
                <UploadButton
                  purpose="task"
                  onUploaded={async (a) => {
                    await api.post(`/v1/tasks/${id}/attachments`, { attachmentId: a.id });
                    refresh();
                  }}
                />
              ) : undefined
            }
          />
          <CardBody>
            {task.attachments.length === 0 ? <p className="text-sm text-muted">{t('common.emptyList')}</p> : <AttachmentList items={task.attachments} onRemove={task.canEdit ? (a) => detach.mutate(a.id) : undefined} />}
          </CardBody>
        </Card>

        {task.canEdit && (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              className="text-danger"
              icon={<Trash2 className="size-4" />}
              onClick={async () => {
                if (!(await confirm({ title: t('tasks.deleteTitle'), body: task.title, danger: true, confirmLabel: t('common.delete') }))) return;
                await api.del(`/v1/tasks/${id}`);
                refresh();
                router.replace('/tasks');
              }}
            >
              {t('tasks.delete')}
            </Button>
          </div>
        )}
      </div>

      {form && (
        <FormDialog
          open={editing}
          onClose={() => setEditing(false)}
          title={t('common.edit')}
          disabled={!form.title.trim()}
          onSubmit={async () => {
            await api.patch<Task>(`/v1/tasks/${id}`, formToUpdate(form));
            refresh();
          }}
        >
          <TaskFields value={{ ...form, householdId: task.householdId ?? '' }} onChange={setForm} mode="edit" />
        </FormDialog>
      )}

      <FormDialog
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title={t('tasks.offer')}
        description={t('tasks.offerToHint')}
        submitLabel={t('tasks.offer')}
        disabled={!assignee}
        onSubmit={async () => {
          await api.post(`/v1/tasks/${id}/assignments`, { userId: assignee });
          setAssignee('');
          refresh();
        }}
      >
        <Select label={t('tasks.person')} value={assignee} onChange={(ev) => setAssignee(ev.target.value)} placeholder={t('common.selectPlaceholder')} options={others.map((p) => ({ value: p.userId, label: p.displayName }))} />
      </FormDialog>

      <ReminderDialog open={reminderOpen} onClose={() => setReminderOpen(false)} taskId={id} defaultTitle={task.title} defaultAt={task.dueAt} onSaved={refresh} />
    </div>
  );
}
