const VideoTypes =
  "3g2,3gp,asf,avi,f4v,flv,h264,h265,m2ts,m4v,mkv,mov,mp4,mp4v,mpeg,mpg,ogm,ogv,rm,rmvb,ts,vob,webm,wmv,y4m,m4s".split(
    ",",
  )
const AudioTypes =
  "aac,ac3,aiff,ape,au,cue,dsf,dts,flac,m4a,mid,midi,mka,mp3,mp4a,oga,ogg,opus,spx,tak,tta,wav,weba,wma,wv".split(
    ",",
  )
export const ImageTypes =
  "apng,avif,bmp,gif,j2k,jp2,jfif,jpeg,jpg,jxl,mj2,png,svg,tga,tif,tiff,webp".split(
    ",",
  )
function endsWith(s: string | undefined, exts: string[]) {
  if (!s?.length) {
    return false
  }
  for (const i of exts) {
    if (i.length === 0) {
      return !s.includes(".")
    }
    if (s.endsWith(`.${i}`)) {
      return true
    }
  }
  return false
}

export function isVideo(s: string, types = VideoTypes) {
  return endsWith(s.toLocaleLowerCase(), types)
}
export function isAudio(s: string, types = AudioTypes) {
  return endsWith(s.toLocaleLowerCase(), types)
}
export function isImage(s: string, types = ImageTypes) {
  return endsWith(s.toLocaleLowerCase(), types)
}
function writeWavHeader(
  view: DataView,
  numFrames: number,
  sampleRate: number,
  numChannels: number,
) {
  const blockAlign = numChannels * 2
  const byteRate = sampleRate * blockAlign
  const dataSize = numFrames * blockAlign

  writeString(view, 0, "RIFF")
  view.setUint32(4, 36 + dataSize, true)
  writeString(view, 8, "WAVE")
  writeString(view, 12, "fmt ")
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, 16, true)
  writeString(view, 36, "data")
  view.setUint32(40, dataSize, true)
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i))
  }
}

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const length = buffer.length * numChannels * 2 // 16bit
  const wavBuffer = new ArrayBuffer(44 + length)
  const view = new DataView(wavBuffer)

  writeWavHeader(view, buffer.length, sampleRate, numChannels)

  let offset = 44

  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      let sample = buffer.getChannelData(ch)[i]
      sample = Math.max(-1, Math.min(1, sample))
      view.setInt16(offset, sample * 0x7fff, true)
      offset += 2
    }
  }

  return new Blob([wavBuffer], { type: "audio/wav" })
}

export async function getWavUrl(videoUrl: string) {
  const audioContext = new AudioContext()
  const response = await fetch(videoUrl)
  const arrayBuffer = await response.arrayBuffer()
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
  const blob = audioBufferToWav(audioBuffer)
  const assetUrl = URL.createObjectURL(blob)
  return assetUrl
}
