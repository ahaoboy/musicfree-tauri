import { FC } from "react"
import { Spin, Flex } from "antd"

interface LoadingFallbackProps {
  tip?: string
  fullscreen?: boolean
}

/**
 * Loading fallback component for Suspense boundaries
 */
export const LoadingFallback: FC<LoadingFallbackProps> = ({
  tip = "Loading...",
  fullscreen = false,
}) => {
  if (fullscreen) {
    return <Spin fullscreen size="large" tip={tip} />
  }

  return (
    <Flex flex={1} align="center" justify="center" className="page">
      <Spin size="large" tip={tip} />
    </Flex>
  )
}

export default LoadingFallback
