import { FC } from "react"
import { Result, Flex } from "antd"
import ReloadOutlined from "@ant-design/icons/ReloadOutlined"
import HomeOutlined from "@ant-design/icons/HomeOutlined"
import { useNavigate } from "react-router-dom"
import { ErrorBoundary } from "../ErrorBoundary"
import { AdaptiveButton } from "../AdaptiveButton"

interface PageErrorFallbackProps {
  error: Error
  onReset: () => void
}

const PageErrorFallback: FC<PageErrorFallbackProps> = ({ error, onReset }) => {
  const navigate = useNavigate()

  return (
    <Flex
      vertical
      flex={1}
      align="center"
      justify="center"
      className="page"
      style={{ padding: 24 }}
    >
      <Result
        status="error"
        title="Page Error"
        subTitle={error.message || "Failed to load this page"}
        extra={[
          <AdaptiveButton
            key="retry"
            type="primary"
            icon={<ReloadOutlined />}
            onClick={onReset}
          >
            Retry
          </AdaptiveButton>,
          <AdaptiveButton
            key="home"
            icon={<HomeOutlined />}
            onClick={() => navigate("/playlists")}
          >
            Go Home
          </AdaptiveButton>,
        ]}
      />
    </Flex>
  )
}

interface PageErrorBoundaryProps {
  children: React.ReactNode
  onReset?: () => void
}

/**
 * Page-level Error Boundary with navigation options
 */
export const PageErrorBoundary: FC<PageErrorBoundaryProps> = ({
  children,
  onReset,
}) => {
  return (
    <ErrorBoundary
      fallback={
        <PageErrorFallback
          error={new Error("Page failed to load")}
          onReset={onReset || (() => window.location.reload())}
        />
      }
      onReset={onReset}
    >
      {children}
    </ErrorBoundary>
  )
}

export default PageErrorBoundary
