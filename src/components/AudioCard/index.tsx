import { FC, useState, useEffect } from 'react';
import { get_loacl_url, LocalAudio } from '../../api';

interface AudioCardProps {
  audio: LocalAudio;
  onClick?: () => void;
  showAction?: boolean;
  actionIcon?: React.ReactNode;
  onAction?: () => void;
}

// Audio info display card
// Shows cover image (left), title, platform, and optional action button (right)
export const AudioCard: FC<AudioCardProps> = ({
  audio,
  onClick,
  showAction = false,
  actionIcon,
  onAction,
}) => {
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadCover = async () => {
      if (audio.cover_path) {
        try {
          const url = await get_loacl_url(audio.cover_path);
          setCoverUrl(url);
        } catch (error) {
          console.error('Failed to load cover:', error);
        }
      } else if (audio.audio.cover) {
        setCoverUrl(audio.audio.cover);
      }
    };
    loadCover();
  }, [audio.cover_path, audio.audio.cover]);

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAction?.();
  };

  return (
    <div className="audio-card" onClick={onClick}>
      <div className="audio-cover">
        {coverUrl ? (
          <img src={coverUrl} alt={audio.audio.title} />
        ) : (
          <div className="cover-placeholder">
            {audio.audio.title.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div className="audio-info">
        <div className="audio-title">{audio.audio.title}</div>
        <div className="audio-meta">
          <span className="audio-platform">{audio.audio.platform}</span>
        </div>
      </div>
      {showAction && actionIcon && (
        <div className="audio-action" onClick={handleActionClick}>
          {actionIcon}
        </div>
      )}
    </div>
  );
};

export default AudioCard;
