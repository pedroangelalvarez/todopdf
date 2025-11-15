<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import FileThumbnail from "./FileThumbnail.svelte";
  import { getFileType } from "$lib/utils/fileTypes";
  import PdfGroupBubble from "./PdfGroupBubble.svelte";

  export let files: File[] = [];
  export let onEditImage: (file: File) => void = () => {};
  export let onRemoveFile: (file: File) => void = () => {};

  const dispatch = createEventDispatcher();

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    const files = Array.from(e.dataTransfer?.files || []);
    dispatch("filesAdded", { files });
  }

  function handleSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    dispatch("filesAdded", { files });
  }

  function triggerSelect() {
    const input = document.getElementById('file-input') as HTMLInputElement | null;
    input?.click();
  }
</script>

<div 
  class="dropzone"
  role="button"
  tabindex="0"
  aria-label="Zona de carga de documentos"
  on:dragover|preventDefault
  on:drop={handleDrop}
  on:click={triggerSelect}
>
  <div class="inner">
    <div class="header">
      <div class="icon" aria-hidden="true">⬆️</div>
      <p>Arrastra tus archivos o haz click para seleccionar</p>
    </div>

    <div class="preview-grid">
      {#if files.length === 0}
        <div class="empty">No hay archivos aún</div>
      {:else}
        {#each files as f}
          {#if getFileType(f) === 'pdf'}
            <PdfGroupBubble file={f} onRemove={onRemoveFile} />
          {:else}
            <FileThumbnail file={f} fileType={getFileType(f)} onEdit={onEditImage} onRemove={onRemoveFile} />
          {/if}
        {/each}
      {/if}
    </div>
  </div>

  <input id="file-input" type="file" multiple accept="application/pdf,.docx,image/jpeg,image/png,image/webp" on:change={handleSelect} />
</div>

<style>
.dropzone {
  max-width: 960px;
  margin: 40px auto;
  min-height: 280px;
  border-radius: 16px;
  border: 1px solid rgba(0,0,0,0.1);
  background: linear-gradient(135deg, rgba(245,247,250,0.9), rgba(233,235,239,0.85));
  box-shadow: 0 10px 30px rgba(0,0,0,0.08);
  text-align: center;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}
.inner {
  padding: 24px;
}
.header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #334155;
  font-weight: 600;
  margin-bottom: 16px;
}
.icon {
  font-size: 20px;
}
.preview-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: center;
}
.empty {
  color: #64748b;
}
input[type="file"] {
  display: none;
}
</style>