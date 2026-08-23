/**
 * Utilidades para detección y conversión automática de URLs de videos
 * Soporta: Google Drive, YouTube, Loom, Vimeo, Wistia y enlaces directos.
 */

export function extractSrcFromIframe(htmlString) {
  if (!htmlString || typeof htmlString !== 'string') return '';
  const match = htmlString.match(/src=["']([^"']+)["']/i);
  return match ? match[1] : htmlString.trim();
}

export function getEmbedUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  
  let url = rawUrl.trim();
  
  // Si el usuario pegó el código <iframe> completo, extraer el src
  if (url.includes('<iframe') && url.includes('src=')) {
    url = extractSrcFromIframe(url);
  }

  try {
    // 1. GOOGLE DRIVE
    // Formato estándar: https://drive.google.com/file/d/ID/view?usp=sharing
    // Formato open/id: https://drive.google.com/open?id=ID
    // Formato uc/id: https://drive.google.com/uc?id=ID
    const driveFileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
    if (driveFileMatch) {
      const fileId = driveFileMatch[1];
      return `https://drive.google.com/file/d/${fileId}/preview`;
    }
    const driveIdParamMatch = url.match(/drive\.google\.com\/(?:open|uc)\?(?:[^&]*&)*id=([a-zA-Z0-9_-]+)/i);
    if (driveIdParamMatch) {
      const fileId = driveIdParamMatch[1];
      return `https://drive.google.com/file/d/${fileId}/preview`;
    }

    // 2. YOUTUBE
    // Formatos: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/shorts/ID, youtube.com/embed/ID
    if (url.includes('youtube.com/watch')) {
      const videoId = url.split('v=')[1]?.split('&')[0];
      if (videoId) return `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`;
    } else if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0];
      if (videoId) return `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`;
    } else if (url.includes('youtube.com/shorts/')) {
      const videoId = url.split('youtube.com/shorts/')[1]?.split('?')[0];
      if (videoId) return `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`;
    } else if (url.includes('youtube.com/embed/') || url.includes('youtube-nocookie.com/embed/')) {
      return url.includes('?') ? url : `${url}?autoplay=0&rel=0`;
    }

    // 3. LOOM
    // Formato: https://www.loom.com/share/ID o https://www.loom.com/embed/ID
    const loomMatch = url.match(/loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/i);
    if (loomMatch) {
      const videoId = loomMatch[1];
      return `https://www.loom.com/embed/${videoId}`;
    }

    // 4. VIMEO
    // Formatos: https://vimeo.com/123456789 o https://player.vimeo.com/video/123456789
    const vimeoMatch = url.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)([0-9]+)/i);
    if (vimeoMatch) {
      const videoId = vimeoMatch[1];
      return `https://player.vimeo.com/video/${videoId}`;
    }

    // 5. WISTIA
    // Formato: https://fast.wistia.net/embed/iframe/ID o https://somedomain.wistia.com/medias/ID
    const wistiaMatch = url.match(/wistia\.(?:com\/medias|net\/embed\/iframe)\/([a-zA-Z0-9]+)/i);
    if (wistiaMatch) {
      const videoId = wistiaMatch[1];
      return `https://fast.wistia.net/embed/iframe/${videoId}`;
    }

    return url;
  } catch {
    return url;
  }
}

export function detectVideoPlatform(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const url = rawUrl.toLowerCase();
  
  if (url.includes('drive.google.com')) {
    return { name: 'Google Drive', color: '#10b981', badge: 'Google Drive', icon: '📁' };
  }
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return { name: 'YouTube', color: '#ef4444', badge: 'YouTube', icon: '▶️' };
  }
  if (url.includes('loom.com')) {
    return { name: 'Loom', color: '#3d5fa3', badge: 'Loom', icon: '🎥' };
  }
  if (url.includes('vimeo.com')) {
    return { name: 'Vimeo', color: '#0ea5e9', badge: 'Vimeo', icon: '🎬' };
  }
  if (url.includes('wistia.')) {
    return { name: 'Wistia', color: '#f59e0b', badge: 'Wistia', icon: '⚡' };
  }
  if (url.match(/\.(mp4|webm|ogg)($|\?)/i)) {
    return { name: 'Video MP4/WebM', color: '#2e4a85', badge: 'Video Directo', icon: '📹' };
  }
  return null;
}
