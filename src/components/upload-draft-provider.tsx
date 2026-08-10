"use client";

import { createContext, useContext, useMemo, useState } from "react";

type UploadDraft = {
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
  clearFiles: () => void;
};

const UploadDraftContext = createContext<UploadDraft | null>(null);

export function UploadDraftProvider({ children }: { children: React.ReactNode }) {
  const [files, setFiles] = useState<File[]>([]);
  const value = useMemo(() => ({ files, setFiles, clearFiles: () => setFiles([]) }), [files]);

  return <UploadDraftContext.Provider value={value}>{children}</UploadDraftContext.Provider>;
}

export function useUploadDraft() {
  const draft = useContext(UploadDraftContext);
  if (!draft) throw new Error("useUploadDraft must be used within UploadDraftProvider");
  return draft;
}
