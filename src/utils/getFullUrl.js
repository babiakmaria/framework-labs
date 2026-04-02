export function getFullImageUrl(request, imagePath) {
  if (!imagePath) return null;

  return `${request.protocol}://${request.headers.host}${imagePath}`;
}