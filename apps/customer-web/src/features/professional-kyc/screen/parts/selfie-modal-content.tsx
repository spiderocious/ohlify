import { useState } from 'react';

import { AppButton, AppText } from '@ohlify/ui';

import { uploadFile, useFilePreview } from '@ohlify/api';

interface SelfieModalContentProps {
  initialKey?: string | null;
  onSubmit: (key: string) => Promise<void>;
  onSuccess?: () => void;
}

export function SelfieModalContent({ initialKey, onSubmit, onSuccess }: SelfieModalContentProps) {
  const [key, setKey] = useState<string | null>(initialKey ?? null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { uri: previewUri } = useFilePreview(key);

  const canSubmit = key !== null && !isUploading && !isSaving;

  const handleFile = async (file: File) => {
    setUploadError(null);
    setIsUploading(true);
    try {
      const { key: newKey } = await uploadFile(file);
      setKey(newKey);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!canSubmit || !key) return;
    setIsSaving(true);
    try {
      await onSubmit(key);
      onSuccess?.();
    } catch {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <AppText variant="body" align="start" color="var(--ohl-text-muted)">
        Use your front camera or upload a clear photo. We compare it with your submitted ID.
      </AppText>

      {previewUri ? (
        <div className="relative overflow-hidden rounded-2xl border border-border">
          <img src={previewUri} alt="Selfie preview" className="h-56 w-full object-cover" />
          <button
            type="button"
            onClick={() => setKey(null)}
            className="absolute right-2 top-2 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white"
          >
            Replace
          </button>
        </div>
      ) : (
        <label className="flex h-56 w-full cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-border bg-surface text-text-muted hover:border-primary/60">
          {/* `capture="user"` tells mobile browsers to open the front camera. */}
          <input
            type="file"
            accept="image/jpeg,image/png"
            capture="user"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
          <span className="text-sm">
            {isUploading ? 'Uploading…' : 'Tap to take or upload a selfie'}
          </span>
        </label>
      )}
      {uploadError ? <p className="text-xs text-error">{uploadError}</p> : null}

      <AppButton
        label={isSaving ? 'Saving…' : 'Save selfie'}
        expanded
        radius={100}
        isDisabled={!canSubmit}
        isLoading={isSaving}
        onPressed={handleSave}
      />
    </div>
  );
}
