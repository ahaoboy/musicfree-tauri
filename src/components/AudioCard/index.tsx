import { FC, useState, useEffect } from "react"
import { Flex, Typography, Avatar } from "antd"
import { AudioOutlined } from "@ant-design/icons"
import { DEFAULT_COVER_URL, get_web_url, LocalAudio } from "../../api"

const { Text } = Typography

interface AudioCardProps {
  audio: LocalAudio
  onClick?: () => void
  showAction?: boolean
  actionIcon?: React.ReactNode
  onAction?: () => void
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
  const [coverUrl, setCoverUrl] = useState<string | null>(null)

  useEffect(() => {
    const loadCover = async () => {
      if (audio.cover_path) {
        try {
          const url = await get_web_url(audio.cover_path)
          setCoverUrl(url)
        } catch (error) {
          console.error("Failed to load cover:", error)
        }
      } else if (audio.audio.cover) {
        setCoverUrl(audio.audio.cover)
      }
    }
    loadCover()
  }, [audio.cover_path, audio.audio.cover])

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onAction?.()
  }

  return (
    <Flex
      className="audio-card"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onClick?.()
        }
      }}
      align="center"
      gap="middle"
    >
      <Avatar
        src={coverUrl || DEFAULT_COVER_URL}
        icon={<AudioOutlined />}
        size={56}
        shape="square"
        alt={audio.audio.title}
        className="audio-cover"
      />
      <Flex vertical flex={1} style={{ minWidth: 0 }}>
        <Text
          strong
          ellipsis={{ tooltip: audio.audio.title }}
          className="audio-title"
        >
          {audio.audio.title}
        </Text>
        <Flex className="audio-meta" align="center" gap="small">
          <Text type="secondary" className="audio-platform">
            {audio.audio.platform}
          </Text>
        </Flex>
      </Flex>
      {showAction && actionIcon && (
        <div
          className="audio-action"
          onClick={handleActionClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation()
              onAction?.()
            }
          }}
        >
          {actionIcon}
        </div>
      )}
    </Flex>
  )
}

export default AudioCard
