import { FC, memo, useCallback } from "react"
import { Flex, Typography, Avatar, Button } from "antd"
import FolderOutlined from "@ant-design/icons/FolderOutlined"
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

    const handleClick = useCallback(
      (e: React.MouseEvent | React.KeyboardEvent) => {
        if ("key" in e && e.key !== "Enter" && e.key !== " ") return
        onClick?.()
      },
      [onClick],
    )

    const handleActionClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation()
        onAction?.()
      },
      [onAction],
    )

    return (
      <Flex
        className="playlist-card"
        onClick={onClick ? handleClick : undefined}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? handleClick : undefined}
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
          <Text strong ellipsis>
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
            onClick={onAction ? handleActionClick : undefined}
            style={{ flexShrink: 0 }}
          />
        )}
      </Flex>
    )
  },
)

PlaylistCard.displayName = "PlaylistCard"

export default PlaylistCard
