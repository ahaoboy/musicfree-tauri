import { FC, ReactNode } from "react"
import { Checkbox, Typography, Flex } from "antd"
import ClearOutlined from "@ant-design/icons/ClearOutlined"
import { AudioCard, AdaptiveButton } from "../../components"
import { Platform } from "../../api"

const { Text } = Typography

interface SearchBottomBarProps {
  playlist: {
    title?: string
    platform: Platform
    audios: any[]
  }
  playlistCoverUrl?: string | null
  isAllSelected: boolean
  isSomeSelected: boolean
  onToggleSelectAll: (checked: boolean) => void
  showClearButton: boolean
  longPendingCount: number
  onClear: () => void
  downloadButtonIcon: ReactNode
  downloadButtonText: string
  isDownloadingAll: boolean
  isSelectedEmpty: boolean
  onDownloadAll: () => void
}

export const SearchBottomBar: FC<SearchBottomBarProps> = ({
  playlist,
  playlistCoverUrl,
  isAllSelected,
  isSomeSelected,
  onToggleSelectAll,
  showClearButton,
  longPendingCount,
  onClear,
  downloadButtonIcon,
  downloadButtonText,
  isDownloadingAll,
  isSelectedEmpty,
  onDownloadAll,
}) => {
  const audioCount = playlist.audios?.length || 0
  return (
    <div className="search-bottom-bar">
      <AudioCard
        coverPath={null}
        coverUrl={playlistCoverUrl || undefined}
        platform={playlist.platform}
        title={playlist.title || "Search Result"}
        subtitle={`${audioCount} ♪`}
        active={false}
        actions={
          <Flex align="center" gap="small">
            <Checkbox
              checked={isAllSelected}
              indeterminate={isSomeSelected}
              onChange={(e) => onToggleSelectAll(e.target.checked)}
              disabled={isDownloadingAll}
            />

            {showClearButton && (
              <AdaptiveButton
                icon={<ClearOutlined />}
                onClick={onClear}
                disabled={isDownloadingAll}
                aria-label="Clear failed/long pending"
              >
                {longPendingCount > 0 && (
                  <Text
                    style={{
                      color: "#faad14",
                      marginLeft: 4,
                      fontSize: "inherit",
                    }}
                  >
                    {longPendingCount}
                  </Text>
                )}
              </AdaptiveButton>
            )}

            <AdaptiveButton
              type="primary"
              icon={downloadButtonIcon}
              onClick={onDownloadAll}
              disabled={isSelectedEmpty || isDownloadingAll}
            >
              {downloadButtonText}
            </AdaptiveButton>
          </Flex>
        }
      />
    </div>
  )
}
