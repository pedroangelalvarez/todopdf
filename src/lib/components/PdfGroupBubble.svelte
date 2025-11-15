<script lang="ts">
  import { onMount } from 'svelte';

  export let file: File;
  export let onRemove: (file: File) => void = () => {};

  let objectUrl = '';
  let numPages = 0;
  let loading = true;
  let error = '';
  let expanded = false;
  let thumbsLoaded = false;
  let thumbUrls: string[] = [];
  let workerRef: Worker | null = null;

  onMount(async () => {
    try {
      const { PDFDocument } = await import('pdf-lib');
      objectUrl = URL.createObjectURL(file);
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
    if (expanded && !thumbsLoaded) {
      renderThumbnails();
    }
  }

  async function renderThumbnails() {
    try {
      const pdfjsModule: any = await import('pdfjs-dist');
      const workerUrl = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url);
      workerRef = new Worker(workerUrl, { type: 'module' });
      pdfjsModule.GlobalWorkerOptions.workerPort = workerRef;

      const pdf = await pdfjsModule.getDocument({ url: objectUrl }).promise;
      const urls: string[] = [];
      const maxThumbs = Math.min(numPages, 12);
      for (let i = 1; i <= maxThumbs; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.3 });
        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;
        await page.render({ canvasContext: ctx, viewport }).promise;
        urls.push(canvas.toDataURL('image/png'));
      }
      thumbUrls = urls;
      thumbsLoaded = true;
      pdf.destroy();
      workerRef?.terminate();
      workerRef = null;
    } catch (e) {
      console.error('Error generando miniaturas PDF', e);
    }
  }

  // Limpieza en desmontaje
  import { onDestroy } from 'svelte';
  onDestroy(() => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    workerRef?.terminate();
    workerRef = null;
  });
</script>

<div class="pdf-bubble" class:expanded class:single={!loading && !error && numPages <= 1}>
  {#if !loading && !error && numPages > 1}
    <button class="expand-btn" aria-label="Expandir" on:click|stopPropagation={toggleExpand}>
      {#if expanded}–{:else}+{/if}
    </button>
  {/if}
  <button class="remove-btn" aria-label="Quitar PDF" on:click|stopPropagation={() => onRemove(file)}>✕</button>

  <div class="content">
    <div class="pdf-icon">PDF</div>
    <div class="info">
      <div class="name" title={file?.name || ''}>{file?.name || ''}</div>
      {#if loading}
        <div class="pages">Cargando páginas…</div>
      {:else if error}
        <div class="pages error">{error}</div>
      {:else}
        <div class="pages">{numPages} páginas</div>
      {/if}
    </div>
  </div>

  {#if expanded}
    <div class="expanded-area">
      {#if !thumbsLoaded}
        <div class="loading">Generando miniaturas…</div>
      {:else}
        <div class="pages-grid">
          {#each thumbUrls as url, i}
            <div class="page-box" title={`Página ${i+1}`}>
              <img src={url} alt={`Página ${i+1}`} />
              <div class="page-index">{i + 1}</div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
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
    height: 360px;
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
    margin: 0 12px 12px 12px;
    padding: 8px;
    border-radius: 12px;
    background: #ffffff;
    border: 1px solid rgba(0,0,0,0.06);
    box-shadow: inset 0 1px 3px rgba(0,0,0,0.03);
    color: #0f172a;
    font-size: 12px;
    line-height: 1.4;
    overflow: auto;
  }
  .loading { color: #64748b; padding: 8px; }
  .pages-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
    gap: 8px;
  }
  .page-box {
    position: relative;
    border: 1px solid rgba(0,0,0,0.08);
    border-radius: 8px;
    overflow: hidden;
    background: #f8fafc;
  }
  .page-box img { width: 100%; display: block; }
  .page-index {
    position: absolute;
    right: 6px;
    bottom: 4px;
    background: rgba(15,23,42,0.6);
    color: #fff;
    padding: 2px 6px;
    border-radius: 999px;
    font-size: 11px;
  }
</style>