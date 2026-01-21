import { FC, useState, useEffect } from "react"
import { Flex, Typography, Avatar } from "antd"
import { FolderOutlined } from "@ant-design/icons"
import { DEFAULT_COVER_URL, get_web_url, LocalPlaylist } from "../../api"

const { Text } = Typography

interface PlaylistCardProps {
  playlist: LocalPlaylist
  onClick?: () => void
  showAction?: boolean
  actionIcon?: React.ReactNode
  onAction?: () => void
}

// Playlist card component showing cover and info
export const PlaylistCard: FC<PlaylistCardProps> = ({
  playlist,
  onClick,
  showAction = false,
  actionIcon,
  onAction,
}) => {
  const [coverUrl, setCoverUrl] = useState<string | null>(null)

  useEffect(() => {
    const loadCover = async () => {
      if (playlist.cover_path) {
        try {
          const url = await get_web_url(playlist.cover_path)
          setCoverUrl(url)
        } catch (error) {
          console.error("Failed to load playlist cover:", error)
        }
      } else if (playlist.cover) {
        setCoverUrl(playlist.cover)
      }
    }
    loadCover()
  }, [playlist.cover_path, playlist.cover])

  const audioCount = playlist.audios?.length || 0

  return (
    <Flex
      className="playlist-card"
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
        icon={<FolderOutlined />}
        size={72}
        shape="square"
        alt={playlist.id}
        className="playlist-cover"
      />
      <Flex vertical flex={1} style={{ minWidth: 0 }}>
        <Text
          strong
          ellipsis={{ tooltip: playlist.id }}
          className="playlist-title"
        >
          {playlist.id}
        </Text>
        <Text type="secondary" className="playlist-meta">
          {audioCount} tracks · {playlist.platform}
        </Text>
      </Flex>
      {showAction && actionIcon && (
        <div
          className="playlist-action"
          onClick={(e) => {
            e.stopPropagation()
            onAction?.()
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation()
              onAction?.()
            }
          }}
          style={{
            fontSize: 18,
            color: "var(--text-secondary)",
            padding: 8,
            cursor: "pointer",
          }}
        >
          {actionIcon}
        </div>
      )}
    </Flex>
  )
}

export default PlaylistCard
