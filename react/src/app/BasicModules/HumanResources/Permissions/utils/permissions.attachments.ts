export const inferAttachmentContentType = (attachment: File) => {
  if (attachment.type) {
    return attachment.type;
  }

  const extension = attachment.name.split('.').pop()?.toLowerCase();
  return {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
  }[extension ?? ''] ?? 'application/octet-stream';
};
