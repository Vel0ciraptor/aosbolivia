'use client';

import React, { useRef } from 'react';
import { X, Download } from 'lucide-react';

interface ReportPreviewModalProps {
  reportHtml: string | null;
  onClose: () => void;
}

export default function ReportPreviewModal({
  reportHtml,
  onClose,
}: ReportPreviewModalProps) {
  const reportIframeRef = useRef<HTMLIFrameElement>(null);

  if (!reportHtml) return null;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800 shrink-0">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-semibold rounded-xl flex items-center gap-2 transition-colors"
        >
          <X className="w-4 h-4" /> Cerrar
        </button>
        <h3 className="text-sm font-bold text-zinc-300">Reporte de servicio</h3>
        <button
          onClick={() => reportIframeRef.current?.contentWindow?.print()}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-colors"
        >
          <Download className="w-4 h-4" /> Imprimir / PDF
        </button>
      </div>
      <iframe
        ref={reportIframeRef}
        srcDoc={reportHtml}
        className="flex-1 w-full bg-white border-0"
        title="Reporte"
      />
    </div>
  );
}

