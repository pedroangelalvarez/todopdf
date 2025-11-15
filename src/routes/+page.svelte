<script lang="ts">
  import FileDropzone from "$lib/components/FileDropzone.svelte";
  import ImageCropModal from "$lib/components/ImageCropModal.svelte";
  import FileList from "$lib/components/FileList.svelte";
  import ImageCropperModal from "$lib/components/ImageCropperModal.svelte";
  import { getFileType } from "$lib/utils/fileTypes";
  import { mergeToPdf } from "$lib/utils/mergeToPdf";

  let files: File[] = [];
  let editorFile: File | null = null;
  let processing = false;
  let toastMsg = '';
  let showToast = false;

  function notify(msg: string) {
    toastMsg = msg;
    showToast = true;
    const current = msg;
    setTimeout(() => {
      // Solo ocultar si no se ha cambiado el mensaje
      if (toastMsg === current) showToast = false;
    }, 4000);
  }

  function isAllowed(file: File): boolean {
    const t = file.type;
    const name = file.name.toLowerCase();
    return (
      t === 'application/pdf' ||
      t === 'image/jpeg' ||
      t === 'image/png' ||
      t === 'image/webp' ||
      t === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      name.endsWith('.docx')
    );
  }

  function handleFilesAdded(e: CustomEvent<{ files: File[] }>) {
    const incoming = e.detail.files;
    const accepted = incoming.filter(isAllowed);
    const rejected = incoming.filter((f) => !isAllowed(f));
    if (rejected.length) {
      notify('Error, tipo de documento no soportado');
    }
    if (accepted.length) {
      files = [...files, ...accepted];
    }
  }

  function openEditor(file: File) {
    editorFile = file;
  }

  function saveEditedImage(blob: Blob) {
    const edited = new File([blob], editorFile!.name, { type: blob.type });
    files = files.map(f => (f === editorFile ? edited : f));
  }

  function removeFile(file: File) {
    files = files.filter(f => f !== file);
  }


  async function processAll() {
    if (!files.length || processing) return;
    processing = true;
    try {
      const out = await mergeToPdf(files);
      const url = URL.createObjectURL(out);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'resultado.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Error procesando PDF', e);
      alert('Ocurrió un error al procesar el PDF.');
    } finally {
      processing = false;
    }
  }
</script>

<FileDropzone on:filesAdded={handleFilesAdded} {files} onEditImage={openEditor} onRemoveFile={removeFile} />

{#if editorFile}
  <ImageCropModal file={editorFile} onClose={() => (editorFile = null)} onSave={saveEditedImage} />
{/if}

{#if editorFile}
  <ImageCropperModal 
    file={editorFile}
    onClose={() => (editorFile = null)}
    onSave={saveEditedImage}
  />
{/if}

<button class="procesar" on:click={processAll} disabled={processing || !files.length}>
  {processing ? 'Procesando…' : 'Procesar'}
</button>

{#if showToast}
  <div class="toast" role="status" aria-live="polite">{toastMsg}</div>
{/if}

<style>
.procesar {
  position: fixed;
  right: 20px;
  bottom: 20px;
  background: #1f6feb;
  color: white;
  border: none;
  padding: 12px 18px;
  border-radius: 8px;
  font-weight: 600;
  box-shadow: 0 6px 16px rgba(0,0,0,0.15);
  cursor: pointer;
}
.procesar:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.toast {
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 1000;
  background: #d93025;
  color: white;
  padding: 12px 18px;
  border-radius: 8px;
  box-shadow: 0 12px 32px rgba(0,0,0,0.18);
  font-weight: 700;
  letter-spacing: 0.2px;
  opacity: 1;
  animation: fadeOut 4s ease forwards;
}

@keyframes fadeOut {
  0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  100% { opacity: 0; transform: translate(-50%, -50%) scale(0.98); }
}
</style>