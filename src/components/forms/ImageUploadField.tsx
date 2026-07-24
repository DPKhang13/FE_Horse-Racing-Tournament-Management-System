import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

type ImageUploadFieldProps = {
  currentImageUrl?: string;
  fallbackImageUrl?: string;
  alt: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
  shape?: 'circle' | 'square';
  tone?: 'light' | 'dark';
  label?: string;
  helpText?: string;
};

const ImageUploadField = ({
  currentImageUrl,
  fallbackImageUrl,
  alt,
  file,
  onFileChange,
  disabled = false,
  shape = 'square',
  tone = 'light',
  label = 'Image',
  helpText = 'JPG, PNG or WebP, up to 5 MB.',
}: ImageUploadFieldProps) => {
  const inputId = useId();
  const objectUrlRef = useRef<string | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [validationError, setValidationError] = useState('');

  useEffect(() => () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }
  }, []);

  const clearObjectUrl = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    event.target.value = '';

    if (!selectedFile) {
      return;
    }

    if (!selectedFile.type.startsWith('image/')) {
      setValidationError('Please select an image file.');
      return;
    }

    if (selectedFile.size > MAX_IMAGE_SIZE_BYTES) {
      setValidationError('Image size must not exceed 5 MB.');
      return;
    }

    clearObjectUrl();
    const nextPreviewUrl = URL.createObjectURL(selectedFile);
    objectUrlRef.current = nextPreviewUrl;
    setLocalPreviewUrl(nextPreviewUrl);
    setValidationError('');
    onFileChange(selectedFile);
  };

  const handleClearSelection = () => {
    clearObjectUrl();
    setLocalPreviewUrl(null);
    setValidationError('');
    onFileChange(null);
  };

  const previewUrl = localPreviewUrl || currentImageUrl || fallbackImageUrl;
  const isDark = tone === 'dark';
  const shapeClassName = shape === 'circle' ? 'rounded-full' : 'rounded-md';

  return (
    <div className={`rounded-lg border p-4 ${isDark ? 'border-slate-700 bg-slate-900/60' : 'border-outline-variant bg-surface-container-low'}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className={`h-28 w-28 shrink-0 overflow-hidden border ${shapeClassName} ${isDark ? 'border-slate-600 bg-slate-800' : 'border-outline-variant bg-white'}`}>
          {previewUrl ? (
            <img src={previewUrl} alt={alt} className="h-full w-full object-cover" />
          ) : (
            <div className={`flex h-full w-full items-center justify-center ${isDark ? 'text-gray-400' : 'text-outline'}`}>
              <ImagePlus className="h-9 w-9" aria-hidden="true" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className={`text-body-sm font-bold ${isDark ? 'text-white' : 'text-primary'}`}>{label}</p>
          <p className={`mt-1 text-label-sm ${isDark ? 'text-gray-400' : 'text-on-surface-variant'}`}>{helpText}</p>
          {file && (
            <p className={`mt-2 truncate text-label-sm font-semibold ${isDark ? 'text-emerald-300' : 'text-secondary'}`}>
              Selected: {file.name}
            </p>
          )}
          {validationError && <p className="mt-2 text-label-sm font-semibold text-error">{validationError}</p>}

          <div className="mt-4 flex flex-wrap gap-2">
            <label
              htmlFor={inputId}
              className={`inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-md px-4 py-2 text-label-sm font-bold transition-colors ${
                disabled
                  ? 'cursor-not-allowed opacity-60'
                  : isDark
                    ? 'bg-secondary text-on-secondary hover:bg-secondary/90'
                    : 'bg-secondary text-on-secondary hover:bg-secondary/90'
              }`}
            >
              <ImagePlus className="h-4 w-4" aria-hidden="true" />
              {file ? 'Choose another' : 'Choose image'}
            </label>
            <input
              id={inputId}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={disabled}
              className="sr-only"
            />

            {file && (
              <button
                type="button"
                onClick={handleClearSelection}
                disabled={disabled}
                className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-md border px-4 py-2 text-label-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  isDark
                    ? 'border-slate-600 text-gray-300 hover:border-error hover:text-error'
                    : 'border-outline-variant text-on-surface-variant hover:border-error hover:text-error'
                }`}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Clear
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageUploadField;
