import { useState } from 'react';

import { AppButton, AppText, AppTextAreaInput, AppTextInput } from '@ohlify/ui';
import type { AdminFaq } from '@ohlify/api';

import { DataTable, type ColumnDef } from '../../../shared/parts/data-table.js';
import { DetailDrawer } from '../../../shared/parts/detail-drawer.js';
import { PageHeader } from '../../../shared/parts/page-header.js';
import { StatusPill } from '../../../shared/parts/status-pill.js';
import { confirm, toastError, toastSuccess } from '../../../shared/lib/confirm.js';
import { useCreateFaq, useDeleteFaq, useFaqs, useUpdateFaq } from '../api/use-legal-faqs.js';

export function FaqsScreen() {
  const list = useFaqs();
  const [draft, setDraft] = useState<Partial<AdminFaq> | null>(null);

  const columns: ColumnDef<AdminFaq>[] = [
    { key: 'pos', header: '#', width: '6%', align: 'right', render: (f) => f.sort_order ?? 0 },
    {
      key: 'question',
      header: 'Question',
      width: '60%',
      render: (f) => (
        <AppText variant="body" className="font-semibold text-text-primary">
          {f.question ?? '—'}
        </AppText>
      ),
    },
    {
      key: 'pub',
      header: 'Published',
      width: '14%',
      render: (f) => (
        <StatusPill
          label={f.is_published ? 'Yes' : 'No'}
          tone={f.is_published ? 'success' : 'muted'}
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="FAQs"
        subtitle="Public FAQ list shown in the help section."
        actions={
          <AppButton
            label="New FAQ"
            variant="solid"
            height={36}
            onPressed={() =>
              setDraft({
                question: '',
                answer: '',
                sort_order: (list.data?.length ?? 0) + 1,
                is_published: false,
              })
            }
          />
        }
      />

      <DataTable
        columns={columns}
        rows={list.data}
        rowKey={(f) => f.id}
        isLoading={list.isLoading}
        error={list.error}
        emptyTitle="No FAQs"
        onRowClick={(f) => setDraft(f)}
      />

      <FaqEditor draft={draft} onClose={() => setDraft(null)} />
    </>
  );
}

function FaqEditor({
  draft,
  onClose,
}: {
  draft: Partial<AdminFaq> | null;
  onClose: () => void;
}) {
  const create = useCreateFaq();
  const update = useUpdateFaq(draft?.id ?? '');
  const del = useDeleteFaq(draft?.id ?? '');

  const [question, setQuestion] = useState(draft?.question ?? '');
  const [answer, setAnswer] = useState(draft?.answer ?? '');
  const [sortOrder, setSortOrder] = useState(String(draft?.sort_order ?? 0));
  const [isPub, setIsPub] = useState(Boolean(draft?.is_published));

  const isEdit = Boolean(draft?.id);
  const valid = question.trim() && answer.trim();

  const onSave = () => {
    const payload = {
      question,
      answer,
      sort_order: Number(sortOrder) || 0,
      is_published: isPub,
    };
    (isEdit ? update : create).mutate(payload, {
      onSuccess: () => {
        toastSuccess(isEdit ? 'FAQ saved' : 'FAQ created');
        onClose();
      },
      onError: (err) => toastError(err),
    });
  };

  const onDelete = async () => {
    if (!isEdit) return;
    if (!(await confirm({ title: 'Delete FAQ?', message: 'Cannot be undone.', destructive: true })))
      return;
    del.mutate(undefined, {
      onSuccess: () => {
        toastSuccess('FAQ deleted');
        onClose();
      },
      onError: (err) => toastError(err),
    });
  };

  return (
    <DetailDrawer
      open={Boolean(draft)}
      onClose={onClose}
      title={isEdit ? 'Edit FAQ' : 'New FAQ'}
      width={560}
      footer={
        <>
          {isEdit && <AppButton label="Delete" variant="outline" height={36} onPressed={onDelete} />}
          <AppButton
            label={isEdit ? 'Save' : 'Create'}
            variant="solid"
            height={36}
            isLoading={create.isPending || update.isPending}
            onPressed={valid ? onSave : undefined}
          />
        </>
      }
    >
      <div className="flex flex-col gap-3 px-5 py-4">
        <AppTextInput label="Question" value={question} onChange={setQuestion} />
        <AppTextAreaInput label="Answer (markdown)" value={answer} onChange={setAnswer} />
        <AppTextInput
          label="Sort order"
          inputType="number"
          inputMode="numeric"
          value={sortOrder}
          onChange={setSortOrder}
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isPub} onChange={(e) => setIsPub(e.target.checked)} />
          Published
        </label>
      </div>
    </DetailDrawer>
  );
}
