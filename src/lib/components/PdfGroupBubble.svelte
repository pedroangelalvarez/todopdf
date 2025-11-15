<script lang="ts">
  import { onMount } from 'svelte';

  export let file: File;
  export let onRemove: (file: File) => void = () => {};
  export let onSplit: (file: File) => void = () => {};

  let numPages = 0;
  let loading = true;
  let error = '';
  let expanded = false;

  onMount(async () => {
    try {
      const { PDFDocument } = await import('pdf-lib');
      const buf = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buf);
      numPages = pdfDoc.getPages().length;
      loading = false;
    } catch (e) {
      console.error(e);
      error = 'No se pudo leer el PDF';
      loading = false;
    }
  });

  function toggleExpand() {
    expanded = !expanded;
  }
</script>

<div class="pdf-bubble" class:expanded class:single={!loading && !error && numPages <= 1}>
  {#if !loading && !error && numPages > 1}
    <button class="expand-btn" aria-label="Expandir" on:click|stopPropagation={() => onSplit(file)}>
      +
    </button>
  {/if}
  <button class="remove-btn" aria-label="Quitar PDF" on:click|stopPropagation={() => onRemove(file)}>✕</button>

  <div class="content">
    <div class="pdf-icon">PDF</div>
    <div class="info">
      <div class="name" title={file.name}>{file.name}</div>
      {#if loading}
        <div class="pages">Cargando páginas…</div>
      {:else if error}
        <div class="pages error">{error}</div>
      {:else}
        <div class="pages">{numPages} páginas</div>
      {/if}
    </div>
  </div>

  <!-- Al expandir, se ejecuta la división y esta área ya no es necesaria -->
</div>

<style>
  .pdf-bubble {
    width: 140px;
    height: 140px;
    border-radius: 16px;
    border: 1px solid rgba(0,0,0,0.1);
    background: #f1f5f9;
    box-shadow: 0 8px 20px rgba(0,0,0,0.08);
    position: relative;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .pdf-bubble.expanded {
    height: 320px;
  }
  .pdf-bubble:not(.single) { width: 220px; height: 220px; }
  .expand-btn {
    position: absolute;
    left: 6px;
    top: 6px;
    width: 24px;
    height: 24px;
    border-radius: 999px;
    border: none;
    background: rgba(255,255,255,0.95);
    color: #0f172a;
    font-weight: 700;
    box-shadow: 0 4px 12px rgba(0,0,0,0.12);
    cursor: pointer;
    z-index: 2;
  }
  .remove-btn {
    position: absolute;
    right: 6px;
    top: 6px;
    width: 24px;
    height: 24px;
    border-radius: 999px;
    border: none;
    background: rgba(255,255,255,0.95);
    color: #0f172a;
    font-weight: 700;
    box-shadow: 0 4px 12px rgba(0,0,0,0.12);
    cursor: pointer;
    z-index: 2;
  }
  .content {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 20px;
  }
  .pdf-icon {
    width: 64px;
    height: 64px;
    border-radius: 12px;
    background: #ef4444;
    color: #fff;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 6px 18px rgba(239, 68, 68, 0.35);
  }
  .info {
    display: flex;
    flex-direction: column;
    gap: 4px;
    overflow: hidden;
  }
  .name {
    font-weight: 600;
    color: #0f172a;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
    max-width: 120px;
  }
  .pages { color: #334155; font-size: 12px; }
  .pages.error { color: #ef4444; }

  .expanded-area {
    margin: 0 16px 16px 16px;
    padding: 12px;
    border-radius: 12px;
    background: #ffffff;
    border: 1px solid rgba(0,0,0,0.06);
    box-shadow: 0 8px 20px rgba(0,0,0,0.06);
    color: #0f172a;
    font-size: 13px;
    line-height: 1.4;
  }
</style>