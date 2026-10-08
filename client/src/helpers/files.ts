export function isPhoto(url: string): boolean {
  return !!url.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)(\W|$)/i)
}

export function isVideo(url: string): boolean {
  return !!url.match(/\.(mp4|avi|mov|wmv|flv|webm|mkv|3gp|m4v|mpg|mpeg)(\W|$)/i)
}

export function isMidia(url: string): boolean {
  return !!url.match(/\.(aac|mp3|ogg|wma|alac|flac|wav|mpga)(\W|$)/i)
}

export function isVoice(url: string): boolean {
  return !!url.match(/\.(opus|oga)(\W|$)/i)
}
