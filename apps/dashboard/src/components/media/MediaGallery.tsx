import { useState, useRef, type DragEvent, type ChangeEvent } from 'react';
import {
  Star,
  Trash2,
  ArrowLeft,
  ArrowRight,
  ImagePlus,
  Upload,
  Link as LinkIcon,
  Sparkles,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  useMediaList,
  useMediaMutations,
  type MediaOwnerType,
  type MediaItem,
} from '../../hooks/useMedia';

interface Props {
  propertyId: string;
  ownerType: MediaOwnerType;
  ownerId: string;
  /** Show add/edit controls (admin). Defaults to true. */
  canManage?: boolean;
}

const LUXURY_PRESETS = [
  {
    label: 'King Bed',
    url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
    caption: 'Luxury King Bed',
  },
  {
    label: 'Double Bed',
    url: 'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1200&q=80',
    caption: 'Deluxe Room Bed & Balcony',
  },
  {
    label: 'Living Room',
    url: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80',
    caption: 'Executive Living & Work Desk',
  },
  {
    label: 'Signature Suite',
    url: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80',
    caption: 'Signature Suite Lounge',
  },
  {
    label: 'Ensuite Bath',
    url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80',
    caption: 'Ensuite Luxury Bath',
  },
];

/**
 * Reusable image gallery for Hotel Spark rooms, room categories, and property.
 * Supports:
 * - Direct file upload from device (camera, computer, phone) with multiple file selection
 * - Drag & drop file uploads
 * - 1-Click luxury room preset photography
 * - Add by image URL
 * - Set primary photo, delete photo, reorder photos
 */
export default function MediaGallery({ propertyId, ownerType, ownerId, canManage = true }: Props) {
  const { t } = useTranslation();
  const { data: items = [], isLoading } = useMediaList(propertyId, ownerType, ownerId);
  const { addByUrl, upload, remove, setPrimary, reorder } = useMediaMutations(propertyId, ownerType, ownerId);

  const [url, setUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const move = (index: number, dir: -1 | 1) => {
    const next = [...items];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    const a = next[index];
    const b = next[target];
    if (!a || !b) return;
    next[index] = b;
    next[target] = a;
    reorder.mutate(next.map((m) => m.id));
  };

  const submitUrl = () => {
    if (!url.trim()) return;
    addByUrl.mutate(
      { url: url.trim(), caption: caption.trim() || undefined },
      {
        onSuccess: () => {
          setUrl('');
          setCaption('');
        },
      },
    );
  };

  const handleFiles = async (files: FileList | File[]) => {
    const fileList = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (fileList.length === 0) return;

    setIsUploadingFiles(true);
    try {
      for (let i = 0; i < fileList.length; i++) {
        const f = fileList[i];
        setUploadStatus(`Uploading ${i + 1} of ${fileList.length}: ${f.name}...`);
        await upload.mutateAsync(f);
      }
      setUploadStatus(null);
    } catch (err) {
      console.error('File upload error:', err);
      setUploadStatus('Upload failed. Please try a smaller image.');
    } finally {
      setIsUploadingFiles(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      void handleFiles(e.dataTransfer.files);
    }
  };

  const onFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      void handleFiles(e.target.files);
    }
  };

  const handleAddPreset = (preset: typeof LUXURY_PRESETS[0]) => {
    addByUrl.mutate({
      url: preset.url,
      caption: preset.caption,
    });
  };

  return (
    <div className="space-y-4">
      {/* Upload Zone (Always Visible to Managers) */}
      {canManage && (
        <div className="space-y-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/jpg"
            multiple
            className="hidden"
            onChange={onFileInputChange}
          />

          {/* Drag & Drop Upload Card */}
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => !isUploadingFiles && fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-teal-500 bg-teal-50/70 scale-[1.01]'
                : 'border-teal-200 bg-gradient-to-b from-teal-50/40 to-white hover:border-teal-400 hover:bg-teal-50/50'
            }`}
          >
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 shadow-sm">
                {isUploadingFiles ? (
                  <Loader2 size={24} className="animate-spin" />
                ) : (
                  <Upload size={22} />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-telivity-navy">
                  {isUploadingFiles
                    ? (uploadStatus || 'Uploading photos...')
                    : 'Click or Drag & Drop Photos from Your Device'}
                </p>
                <p className="text-xs text-telivity-mid-grey mt-0.5">
                  Choose photos from your phone or computer • JPG, PNG, WEBP • Multiple photos supported
                </p>
              </div>
              <button
                type="button"
                disabled={isUploadingFiles}
                className="mt-1 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
              >
                <Upload size={13} />
                Browse Device Files
              </button>
            </div>
          </div>

          {/* 1-Click Luxury Room Presets */}
          <div className="bg-gray-50 border border-gray-200/80 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-telivity-slate mb-2">
              <Sparkles size={13} className="text-amber-500" />
              <span>Or add 1-click luxury room sample photos:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {LUXURY_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => handleAddPreset(p)}
                  disabled={addByUrl.isPending}
                  className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-xs font-medium text-telivity-slate hover:border-teal-500 hover:text-teal-700 hover:bg-teal-50/30 transition flex items-center gap-1 shadow-2xs disabled:opacity-50"
                >
                  <ImagePlus size={11} className="text-teal-600" />
                  + {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Existing Media Grid */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-telivity-slate uppercase tracking-wider">
            Current Photos ({items.length})
          </p>
          {items.length > 0 && (
            <span className="text-[11px] text-telivity-mid-grey">
              First photo or starred photo is displayed as Primary
            </span>
          )}
        </div>

        {isLoading ? (
          <p className="text-sm text-telivity-mid-grey py-6 text-center">{t('media.loadingImages')}</p>
        ) : items.length === 0 ? (
          <div className="border border-dashed border-gray-200 rounded-xl p-8 text-center text-sm text-telivity-mid-grey bg-gray-50/50">
            <ImageIcon size={32} className="mx-auto mb-2 text-gray-300" />
            <p className="font-medium text-gray-600">{t('media.noImagesYet')}</p>
            <p className="text-xs text-gray-400 mt-1">
              Upload photos from your computer or phone above to show this room to guests and staff.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {items.map((m: MediaItem, i: number) => (
              <div
                key={m.id}
                className="group relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50 shadow-2xs hover:shadow-md transition-shadow"
              >
                <img
                  src={m.url}
                  alt={m.altText ?? m.caption ?? 'Room photo'}
                  className="w-full h-32 object-cover"
                  loading="lazy"
                />

                {m.isPrimary && (
                  <span className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-telivity-teal text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                    <Star size={10} fill="currentColor" /> {t('media.primary')}
                  </span>
                )}

                {m.caption && (
                  <p className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-[2px] text-white text-[11px] px-2 py-1 truncate">
                    {m.caption}
                  </p>
                )}

                {canManage && (
                  <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!m.isPrimary && (
                      <button
                        title={t('media.setAsPrimary')}
                        onClick={() => setPrimary.mutate(m.id)}
                        className="p-1.5 rounded-md bg-white/95 hover:bg-white text-telivity-slate hover:text-amber-600 shadow-sm transition"
                      >
                        <Star size={13} />
                      </button>
                    )}
                    <button
                      title={t('media.delete')}
                      onClick={() => {
                        if (window.confirm('Delete this photo?')) {
                          remove.mutate(m.id);
                        }
                      }}
                      className="p-1.5 rounded-md bg-white/95 hover:bg-white text-red-500 hover:text-red-700 shadow-sm transition"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}

                {canManage && items.length > 1 && (
                  <div className="absolute bottom-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      title={t('media.moveLeft')}
                      disabled={i === 0}
                      onClick={() => move(i, -1)}
                      className="p-1 rounded bg-white/90 hover:bg-white text-telivity-slate disabled:opacity-30 shadow-xs"
                    >
                      <ArrowLeft size={12} />
                    </button>
                    <button
                      title={t('media.moveRight')}
                      disabled={i === items.length - 1}
                      onClick={() => move(i, 1)}
                      className="p-1 rounded bg-white/90 hover:bg-white text-telivity-slate disabled:opacity-30 shadow-xs"
                    >
                      <ArrowRight size={12} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Alternative: Add via Web URL */}
      {canManage && (
        <details className="mt-3 border-t border-gray-100 pt-3 group text-xs text-telivity-slate">
          <summary className="cursor-pointer font-medium text-teal-700 hover:text-teal-800 flex items-center gap-1.5 select-none">
            <LinkIcon size={12} />
            <span>Or paste an image web link (URL)</span>
          </summary>
          <div className="mt-2.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="flex-1 flex items-center gap-2 border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus-within:border-teal-500">
              <LinkIcon size={13} className="text-gray-400 shrink-0" />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/photo.jpg"
                className="w-full text-xs text-gray-800 focus:outline-none"
              />
            </div>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Caption (e.g. Master Bedroom)"
              className="w-full sm:w-44 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 bg-white focus:outline-none focus:border-teal-500"
            />
            <button
              onClick={submitUrl}
              disabled={!url.trim() || addByUrl.isPending}
              className="bg-teal-600 hover:bg-teal-700 text-white rounded-lg px-3.5 py-1.5 text-xs font-semibold disabled:opacity-50 shrink-0 transition"
            >
              {addByUrl.isPending ? 'Adding...' : t('media.add')}
            </button>
          </div>
          {addByUrl.isError && (
            <p className="text-xs text-red-500 mt-1">{t('media.couldNotAddImage')}</p>
          )}
        </details>
      )}
    </div>
  );
}
