export function getFileType(file: File) {
  const type = file.type;

  if (type.includes("pdf")) return "pdf";
  if (type.includes("word") || file.name.endsWith(".docx") || file.name.endsWith(".doc")) return "docx";
  if (type.startsWith("image/")) return "image";

  return "unknown";
}