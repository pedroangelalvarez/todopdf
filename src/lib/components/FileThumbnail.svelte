<script lang="ts">
  import { formatFileName } from "$lib/utils/formatFileName";
  import { onDestroy } from "svelte";

  export let file: File;
  export let fileType: string;
  export let onEdit: (file: File) => void;
  export let onRemove: (file: File) => void = () => {};

  let previewUrl = "";
  let displayName = "";

  $: displayName = formatFileName(file.name, file.type, 12);

  // Generar y limpiar el ObjectURL de forma reactiva y segura
  $: {
    if (fileType === "image") {
      const prev = previewUrl;
      previewUrl = URL.createObjectURL(file);
      if (prev) URL.revokeObjectURL(prev);
    } else {
      previewUrl = "";
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    if (fileType === "image" && (e.key === "Enter" || e.key === " ")) {
      onEdit(file);
    }
  }

  function previewImage() {
    if (fileType === "image" && previewUrl) {
      window.open(previewUrl, "_blank", "noopener,noreferrer");
    }
  }

  onDestroy(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  });
</script>

<div class="thumb" role="button" tabindex="0" on:click={() => fileType === "image" && onEdit(file)} on:keydown={onKeyDown}>
  <div class="thumb-box">
    <button class="remove-btn" aria-label="Quitar archivo" on:click|stopPropagation={() => onRemove(file)}>✕</button>
    {#if fileType === "image"}
      <img class="thumb-img" src={previewUrl} alt={displayName} />
      <div class="overlay">
        <button class="overlay-btn" on:click|stopPropagation={previewImage} aria-label="Preview imagen">Preview</button>
        <button class="overlay-btn" on:click|stopPropagation={() => onEdit(file)} aria-label="Editar imagen">Edit</button>
      </div>
    {:else if fileType === "pdf"}
      <div class="thumb-icon" aria-label="Archivo PDF">📄</div>
    {:else if fileType === "docx"}
      <div class="thumb-icon" aria-label="Documento Word">📝</div>
    {:else}
      <div class="thumb-icon" aria-label="Tipo desconocido">❓</div>
    {/if}
  </div>
  <p class="thumb-name">{displayName}</p>
</div>

<style>
.thumb {
  width: 140px;
  text-align: center;
  cursor: pointer;
}
.thumb-box {
  width: 140px;
  height: 140px;
  border-radius: 16px;
  border: 1px solid rgba(0,0,0,0.1);
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
}
.remove-btn {
  position: absolute;
  right: 6px;
  top: 6px;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  border: none;
  background: rgba(255,255,255,0.9);
  color: #0f172a;
  font-weight: 700;
  box-shadow: 0 4px 12px rgba(0,0,0,0.12);
  cursor: pointer;
  z-index: 2;
}
.thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
  z-index: 1;
}
.thumb-box:hover .overlay {
  opacity: 1;
  pointer-events: auto;
}
.overlay-btn {
  background: #ffffff;
  color: #0f172a;
  border: none;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  box-shadow: 0 6px 16px rgba(0,0,0,0.15);
  cursor: pointer;
}
.thumb-icon {
  font-size: 36px;
}
.thumb-name {
  margin-top: 8px;
  font-size: 12px;
  color: #334155;
}
</style>