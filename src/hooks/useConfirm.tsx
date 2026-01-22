import { App } from "antd"
import { ExclamationCircleOutlined } from "@ant-design/icons"

interface ConfirmOptions {
  title: string
  content: string
  onOk: () => void | Promise<void>
  okText?: string
  okType?: "primary" | "danger"
  cancelText?: string
}

/**
 * Custom hook for showing consistent confirmation dialogs across the app
 * All confirmation dialogs will have the same style: centered with an exclamation icon
 */
export const useConfirm = () => {
  const { modal } = App.useApp()

  const showConfirm = ({
    title,
    content,
    onOk,
    okText = "OK",
    okType = "primary",
    cancelText = "Cancel",
  }: ConfirmOptions) => {
    modal.confirm({
      title,
      content,
      centered: true,
      icon: <ExclamationCircleOutlined />,
      okText,
      okType,
      cancelText,
      onOk,
    })
  }

  return { showConfirm }
}
