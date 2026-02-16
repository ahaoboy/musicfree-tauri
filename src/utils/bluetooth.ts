/**
 * Utility to detect Bluetooth audio device disconnections and trigger a callback.
 * This can be used to automatically pause playback when headphones are removed.
 */

export interface BluetoothListenerOptions {
  /** Callback when the list of connected media devices changes */
  onDevicesChange: (devices: MediaDeviceInfo[]) => void
  /** Callback triggered when a Bluetooth device is disconnected while media is playing */
  onBluetoothDisconnect: () => void
  /** Function to get the current playing state from the store */
  getIsPlaying: () => boolean
  /** Function to get the current list of connected devices from the store */
  getConnectedDevices: () => MediaDeviceInfo[]
}

const BLUETOOTH_KEYWORDS = [
  "bluetooth",
  "ble",
  "headphone",
  "headset",
  "airpods",
  "buds",
  "wireless",
]

/**
 * Checks if a device label matches any common Bluetooth or headset keywords.
 */
export const isBluetoothDevice = (label: string): boolean => {
  const lowerLabel = label.toLowerCase()
  return BLUETOOTH_KEYWORDS.some((keyword) => lowerLabel.includes(keyword))
}

/**
 * Initializes the media device listeners.
 * @param options Configuration and store integration callbacks.
 * @returns A cleanup function to remove the listener.
 */
export const initBluetoothListener = async (
  options: BluetoothListenerOptions,
) => {
  const {
    onDevicesChange,
    onBluetoothDisconnect,
    getIsPlaying,
    getConnectedDevices,
  } = options

  const handleDeviceChange = async () => {
    // Capture state BEFORE fetching new devices
    const oldDevices = getConnectedDevices()
    const isPlaying = getIsPlaying()

    // Get the new device list
    const newDevices = await navigator.mediaDevices.enumerateDevices()

    // Find disconnected audio output devices
    const disconnected = oldDevices.filter(
      (oldDev) =>
        oldDev.kind === "audiooutput" &&
        !newDevices.find((newDev) => newDev.deviceId === oldDev.deviceId),
    )

    // Log for debugging (can be removed later)
    if (disconnected.length > 0) {
      console.log(
        "Devices disconnected:",
        disconnected.map((d) => d.label),
      )
    }

    // Update the store's device list
    onDevicesChange(newDevices)

    // If something was disconnected while playing, check for Bluetooth
    if (isPlaying && disconnected.length > 0) {
      const hasBluetoothDisconnected = disconnected.some((d) =>
        isBluetoothDevice(d.label),
      )
      if (hasBluetoothDisconnected) {
        onBluetoothDisconnect()
      }
    }
  }

  try {
    // Request permission to get device labels.
    await navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        stream.getTracks().forEach((track) => track.stop())
      })
      .catch((err) => {
        console.warn("Media permission denied or failed:", err)
      })

    // Get initial device list and populate store
    const initialDevices = await navigator.mediaDevices.enumerateDevices()
    onDevicesChange(initialDevices)

    // Register listener
    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange)

    return () => {
      navigator.mediaDevices.removeEventListener(
        "devicechange",
        handleDeviceChange,
      )
    }
  } catch (error) {
    console.error("Critical error in initBluetoothListener:", error)
    return () => {}
  }
}
