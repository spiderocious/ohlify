import { useState } from 'react';

import { AppButton, AppDropdownInput, AppText, AppTextAreaInput, AppTextInput } from '@ohlify/ui';
import { AdminLegalKind } from '@ohlify/api';

import { PageHeader } from '../../../shared/parts/page-header.js';
import { QueryView } from '../../../shared/parts/empty-or-error.js';
import { confirm, toastError, toastSuccess } from '../../../shared/lib/confirm.js';
import { formatDateTime } from '../../../shared/format/datetime.js';
import { humanizeStatus } from '../../../shared/lib/labels.js';
import { useLegalDocs, usePublishLegal } from '../api/use-legal-faqs.js';

const KIND_OPTIONS = Object.values(AdminLegalKind).map((v) => ({
  label: humanizeStatus(v),
  value: v,
}));

export function LegalScreen() {
  const [kind, setKind] = useState<AdminLegalKind>(AdminLegalKind.EULA);
  const [version, setVersion] = useState('');
  const [draft, setDraft] = useState('');
  const list = useLegalDocs(kind);
  const publish = usePublishLegal(kind);

  const onPublish = async () => {
    if (
      !(await confirm({
        title: `Publish new ${humanizeStatus(kind)}?`,
        message: `Creates version "${version}" visible to all users.`,
      }))
    )
      return;
    publish.mutate(
      { version, content_markdown: draft },
      {
        onSuccess: () => {
          toastSuccess('Published');
          setVersion('');
          setDraft('');
        },
        onError: (err) => toastError(err),
      },
    );
  };

  return (
    <>
      <PageHeader title="Legal documents" subtitle="EULA, privacy, terms — version-controlled." />

      <div className="px-6 py-6">
        <div className="mb-4 max-w-xs">
          <AppDropdownInput
            label="Document"
            options={KIND_OPTIONS}
            value={kind}
            onChange={(v) => setKind(v as AdminLegalKind)}
          />
        </div>

        <div className="rounded-lg border border-border bg-surface p-5">
          <AppText variant="bodyTitle">Publish new version</AppText>
          <AppText variant="bodySmall" className="text-text-muted">
            Markdown supported. Version string is required and must be unique per kind.
          </AppText>
          <div className="mt-3 flex flex-col gap-3">
            <AppTextInput
              label="Version"
              placeholder="e.g. 2025-05-01 or v3"
              value={version}
              onChange={setVersion}
            />
            <AppTextAreaInput
              label="Body (markdown)"
              value={draft}
              onChange={setDraft}
              placeholder="# Privacy policy&#10;…"
            />
          </div>
          <div className="mt-3">
            <AppButton
              label="Publish"
              variant="solid"
              height={36}
              isLoading={publish.isPending}
              onPressed={version.trim() && draft.trim() ? onPublish : undefined}
            />
          </div>
        </div>

        <AppText variant="bodyTitle" className="mt-8 mb-3">
          Versions
        </AppText>
        <QueryView isLoading={list.isLoading} error={list.error}>
          {list.data?.items && list.data.items.length > 0 ? (
            <div className="flex flex-col gap-3">
              {list.data.items.map((doc) => (
                <div key={doc.id} className="rounded-lg border border-border bg-surface p-4">
                  <div className="flex items-baseline gap-3">
                    <AppText variant="bodyTitle">v{String(doc.version)}</AppText>
                    <span className="flex-1" />
                    <AppText variant="bodySmall" className="text-text-muted">
                      {formatDateTime(doc.created_at)}
                    </AppText>
                  </div>
                  {doc.content_markdown && (
                    <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-xs text-text-primary">
                      {doc.content_markdown}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <AppText variant="bodySmall" className="text-text-muted">
              No versions yet.
            </AppText>
          )}
        </QueryView>
      </div>
    </>
  );
}
