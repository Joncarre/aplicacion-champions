/**
 * Tratamiento de la foto de perfil en el navegador.
 *
 * La imagen acaba dentro del propio documento del usuario en Firestore, así
 * que hay que dejarla pequeña: se recorta a un cuadrado de 240×240 y se
 * comprime en JPEG, con lo que cabe de sobra en el límite de 1 MB por
 * documento y no hace falta Firebase Storage.
 */

export const AVATAR_SIZE = 240
export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024

/** Cuánto se puede acercar la foto en el editor. */
export const MIN_ZOOM = 1
export const MAX_ZOOM = 4

export interface CropTransform {
  /** Multiplicador sobre la escala que hace que la imagen cubra el marco. */
  zoom: number
  /** Desplazamiento en píxeles de pantalla, respecto al centro del marco. */
  offsetX: number
  offsetY: number
  /** Lado del marco cuadrado, en píxeles de pantalla. */
  viewport: number
}

export async function loadImage(file: File): Promise<HTMLImageElement> {
  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo tiene que ser una imagen')
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('La imagen es demasiado grande (máximo 12 MB)')
  }

  const url = URL.createObjectURL(file)
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error('No se ha podido leer la imagen'))
      image.src = url
    })
  } catch (cause) {
    URL.revokeObjectURL(url)
    throw cause
  }
}

/** Escala mínima para que la imagen cubra el marco cuadrado sin dejar huecos. */
export function coverScale(image: HTMLImageElement, viewport: number): number {
  const width = image.naturalWidth || image.width
  const height = image.naturalHeight || image.height
  return viewport / Math.min(width, height)
}

/**
 * Hasta dónde se puede arrastrar la foto sin que se vea el fondo.
 * Es la mitad de lo que sobresale por cada lado.
 */
export function maxOffset(image: HTMLImageElement, transform: Pick<CropTransform, 'zoom' | 'viewport'>) {
  const scale = coverScale(image, transform.viewport) * transform.zoom
  const width = (image.naturalWidth || image.width) * scale
  const height = (image.naturalHeight || image.height) * scale
  return {
    x: Math.max(0, (width - transform.viewport) / 2),
    y: Math.max(0, (height - transform.viewport) / 2),
  }
}

export function clampOffset(image: HTMLImageElement, transform: CropTransform): CropTransform {
  const limit = maxOffset(image, transform)
  return {
    ...transform,
    offsetX: Math.min(limit.x, Math.max(-limit.x, transform.offsetX)),
    offsetY: Math.min(limit.y, Math.max(-limit.y, transform.offsetY)),
  }
}

/**
 * Aplica el recorte y devuelve la foto lista para guardar.
 *
 * Se reproduce exactamente la misma transformación que el usuario ve en el
 * editor, pero llevada a la resolución final: de ahí el factor `ratio`.
 */
export function cropToDataUrl(image: HTMLImageElement, transform: CropTransform): string {
  const canvas = document.createElement('canvas')
  canvas.width = AVATAR_SIZE
  canvas.height = AVATAR_SIZE

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Tu navegador no puede procesar la imagen')

  const ratio = AVATAR_SIZE / transform.viewport
  const scale = coverScale(image, transform.viewport) * transform.zoom
  const width = (image.naturalWidth || image.width) * scale
  const height = (image.naturalHeight || image.height) * scale

  const x = (transform.viewport / 2 - width / 2 + transform.offsetX) * ratio
  const y = (transform.viewport / 2 - height / 2 + transform.offsetY) * ratio

  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(image, x, y, width * ratio, height * ratio)

  return canvas.toDataURL('image/jpeg', 0.85)
}
