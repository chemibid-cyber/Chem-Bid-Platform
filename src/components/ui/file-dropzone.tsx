'use client';

import { useRef, useState } from 'react';
import { UploadCloud, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileDropzoneProps {
  name: string;
  id?: string;
  accept?: string;
  required?: boolean;
  hint?: string;
  className?: string;
}

/**
 * Friendly drag-and-drop / click-to-browse file picker. Wraps a real (visually
 * hidden) <input type="file"> so it submits inside a <form> exactly like before —
 * same `name`, `accept`, `required`. Shows the chosen filename with a clear button.
 */
export function FileDropzone({ name, id, accept, required, hint, className }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  function syncName(files: FileList | null) {
    setFileName(files && files.length > 0 ? files[0]!.name : null);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (inputRef.current && e.dataTransfer.files?.length) {
      inputRef.current.files = e.dataTransfer.files;
      syncName(e.dataTransfer.files);
    }
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    if (inputRef.current) inputRef.current.value = '';
    setFileName(null);
  }

  return (
    <div className={className}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors',
          dragOver ? 'border-foreground/40 bg-muted' : 'border-input hover:border-foreground/30 hover:bg-muted/40',
        )}
      >
        <UploadCloud className="h-6 w-6 text-muted-foreground" />
        {fileName ? (
          <span className="flex max-w-full items-center gap-2 text-sm font-medium">
            <span className="truncate">{fileName}</span>
            <button
              type="button"
              onClick={clear}
              aria-label="Remove file"
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </span>
        ) : (
          <>
            <span className="text-sm font-medium">
              Drag &amp; drop, or <span className="underline">browse</span> to upload
            </span>
            {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
          </>
        )}
      </div>
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="file"
        accept={accept}
        required={required}
        className="sr-only"
        onChange={(e) => syncName(e.target.files)}
      />
    </div>
  );
}
