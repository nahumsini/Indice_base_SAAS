const messages = {
  attach: ['Adjuntar fotografías','Attach photos','Joindre des photos','Anexar fotos','사진 첨부','附加照片'],
  remove: ['Quitar fotografía','Remove photo','Retirer la photo','Remover foto','사진 삭제','移除照片'],
  help: ['Hasta 5 fotografías JPG, PNG o WebP, de 8 MB cada una.','Up to 5 JPG, PNG or WebP photos, 8 MB each.','Jusqu’à 5 photos JPG, PNG ou WebP, 8 Mo chacune.','Até 5 fotos JPG, PNG ou WebP, 8 MB cada.','JPG, PNG, WebP 사진 최대 5장, 각 8MB.','最多5张JPG、PNG或WebP照片，每张8MB。'],
  invalid: ['Selecciona hasta 5 fotografías JPG, PNG o WebP de máximo 8 MB.','Select up to 5 JPG, PNG or WebP photos, no larger than 8 MB each.','Sélectionnez jusqu’à 5 photos JPG, PNG ou WebP de 8 Mo maximum.','Selecione até 5 fotos JPG, PNG ou WebP de até 8 MB.','최대 8MB의 JPG, PNG, WebP 사진을 5장까지 선택하세요.','请选择最多5张JPG、PNG或WebP照片，每张不超过8MB。'],
  failed: ['No se pudo cargar la fotografía.','Could not load the photo.','Impossible de charger la photo.','Não foi possível carregar a foto.','사진을 불러오지 못했습니다.','无法加载照片。'],
  retry: ['Reintentar','Retry','Réessayer','Tentar novamente','다시 시도','重试'],
  enlarge: ['Ampliar fotografía','Enlarge photo','Agrandir la photo','Ampliar foto','사진 확대','放大照片'],
  reduce: ['Reducir fotografía','Reduce photo','Réduire la photo','Reduzir foto','사진 축소','缩小照片'],
  preparing: ['Preparando fotografías…','Preparing photos…','Préparation des photos…','Preparando fotos…','사진 준비 중…','正在准备照片…'],
  uploadError: ['No se pudieron enviar las fotografías. Se conservan para reintentar; si el problema continúa, quítalas y adjúntalas de nuevo.','Could not send photos. They are kept for retry; if it continues, remove and attach them again.','Envoi impossible. Les photos sont conservées pour réessayer ; si nécessaire, retirez-les et joignez-les à nouveau.','Não foi possível enviar. As fotos foram mantidas; se persistir, remova e anexe novamente.','사진 전송 실패. 재시도할 수 있도록 보관됩니다. 계속 실패하면 삭제 후 다시 첨부하세요.','照片发送失败，已保留以便重试。如仍失败，请移除后重新附加。'],
} as const;
export function photoCopy(locale: string) {
  const index = locale.startsWith('es') ? 0 : locale.startsWith('fr') ? 2 : locale.startsWith('pt') ? 3 : locale.startsWith('ko') ? 4 : locale.startsWith('zh') ? 5 : 1;
  return Object.fromEntries(Object.entries(messages).map(([key, values]) => [key, values[index]])) as Record<keyof typeof messages, string>;
}
