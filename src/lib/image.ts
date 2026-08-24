/**
 * Redimensiona la foto de perfil en el navegador y la devuelve como data URL.
 *
 * Se guarda dentro del propio documento del usuario en Firestore, así que hay
 * que mantenerla pequeña: 240×240 recortada al centro y comprimida en JPEG cabe
 * de sobra en el límite de 1 MB por documento.
 */

export const AVATAR_SIZE = 240
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024

export async function fileToAvatarDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo tiene que ser una imagen')
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('La imagen es demasiado grande (máximo 8 MB)')
  }

  const bitmap = await loadBitmap(file)
  const canvas = document.createElement('canvas')
  canvas.width = AVATAR_SIZE
  canvas.height = AVATAR_SIZE

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Tu navegador no puede procesar la imagen')

  // Recorte cuadrado centrado, sin deformar la foto.
  const side = Math.min(bitmap.width, bitmap.height)
  const sx = (bitmap.width - side) / 2
  const sy = (bitmap.height - side) / 2
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE)
  if ('close' in bitmap) bitmap.close()

  return canvas.toDataURL('image/jpeg', 0.82)
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file)
  }
  const url = URL.createObjectURL(file)
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('No se ha podido leer la imagen'))
      img.src = url
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}
