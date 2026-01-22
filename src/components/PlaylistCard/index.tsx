import { FC, memo, useMemo } from "react"
import { Flex, Typography, Avatar, Button } from "antd"
import { FolderOutlined } from "@ant-design/icons"
import { DEFAULT_COVER_URL, LocalPlaylist } from "../../api"
import { useCoverUrl } from "../../hooks"

const { Text } = Typography

interface PlaylistCardProps {
  playlist: LocalPlaylist
  onClick?: () => void
  showAction?: boolean
  actionIcon?: React.ReactNode
  onAction?: () => void
}

// Playlist card component - Optimized with memo
export const PlaylistCard: FC<PlaylistCardProps> = memo(
  ({ playlist, onClick, showAction = false, actionIcon, onAction }) => {
    const coverUrl = useCoverUrl(playlist.cover_path, playlist.cover)
    const audioCount = playlist.audios?.length || 0
    const displayName = playlist.title || playlist.id

    const handleClick = useMemo(
      () =>
        onClick
          ? (e: React.MouseEvent | React.KeyboardEvent) => {
              if ("key" in e && e.key !== "Enter" && e.key !== " ") return
              onClick()
            }
          : undefined,
      [onClick],
    )

    const handleActionClick = useMemo(
      () =>
        onAction
          ? (e: React.MouseEvent) => {
              e.stopPropagation()
              onAction()
            }
          : undefined,
      [onAction],
    )

    return (
      <Flex
        className="playlist-card"
        onClick={handleClick}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={handleClick}
        align="center"
        gap="middle"
        style={{ cursor: onClick ? "pointer" : "default" }}
      >
        <Avatar
          src={coverUrl || DEFAULT_COVER_URL}
          icon={<FolderOutlined />}
          size={56}
          shape="square"
          alt={displayName}
          className="card-avatar"
        />
        <Flex vertical flex={1} style={{ minWidth: 0 }}>
          <Text strong ellipsis={{ tooltip: displayName }}>
            {displayName}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {audioCount} tracks · {playlist.platform}
          </Text>
        </Flex>
        {showAction && actionIcon && (
          <Button
            type="text"
            icon={actionIcon}
            onClick={handleActionClick}
            style={{ flexShrink: 0 }}
          />
        )}
      </Flex>
    )
  },
)

PlaylistCard.displayName = "PlaylistCard"

export default PlaylistCard
