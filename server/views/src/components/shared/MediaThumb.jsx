import { uploadsUrl } from '../../api';
import { getFileType } from '../../utils';

export default function MediaThumb({ file, size = 'md' }) {
  const type = getFileType(file.name);
  const url = uploadsUrl(file.name);
  const dims = size === 'sm' ? 'w-8 h-6 rounded' : 'w-12 h-9 rounded';

  return (
    <div className={`${dims} bg-black/30 flex items-center justify-center overflow-hidden shrink-0`}>
      {type === 'image' && <img src={url} loading="lazy" className="w-full h-full object-cover" />}
      {type === 'video' && <span className="text-text-dim text-sm">&#9654;</span>}
      {type === 'audio' && <span className="text-text-dim text-sm">&#9835;</span>}
      {type === 'autre' && <span className="text-text-dim text-sm">&#128196;</span>}
    </div>
  );
}
