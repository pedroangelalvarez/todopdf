<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	export let file: File;
	export let onRemove: (file: File) => void = () => {};

	let loading = true;
	let error = '';
	let expanded = false;
	let previewHtml = '';
	let bubbleEl: HTMLDivElement | null = null;
	let rowSpan = 1;

	onMount(async () => {
		try {
			// Importar mammoth para convertir docx a HTML
			const mammoth = await import('mammoth');
			const arrayBuffer = await file.arrayBuffer();

			const result = await mammoth.convertToHtml({ arrayBuffer });
			previewHtml = result.value;
			loading = false;
		} catch (e) {
			console.error(e);
			error = 'No se pudo leer el documento Word';
			loading = false;
		}
	});

	async function toggleExpand() {
		expanded = !expanded;
		rowSpan = 1;
	}

	// Limpieza en desmontaje
	onDestroy(() => {
		// Limpiar si es necesario
	});

	// Calcula cuántas filas debe ocupar el elemento en el grid externo
	function updateRowSpan() {
		if (!bubbleEl) return;
		const rowHeight = 160; // definido en FileDropzone: grid-auto-rows: 160px
		const gap = 16; // definido en FileDropzone: gap: 16px
		const height = bubbleEl.scrollHeight;
		const rows = Math.ceil((height + gap) / (rowHeight + gap));
		rowSpan = Math.max(1, rows);
	}

	// Observa cambios de tamaño para ajustar el span dinámicamente
	let ro: ResizeObserver | null = null;
	onMount(() => {
		ro = new ResizeObserver(() => {
			if (expanded) updateRowSpan();
		});
		if (bubbleEl) ro.observe(bubbleEl);
	});
	onDestroy(() => {
		ro?.disconnect();
		ro = null;
	});
</script>

<div class="word-bubble" bind:this={bubbleEl} style="grid-row: span {rowSpan};">
	<button
		class="remove-btn"
		aria-label="Quitar documento"
		on:click|stopPropagation={() => onRemove(file)}>✕</button
	>

	{#if !loading && !error && previewHtml}
		<button
			class="preview-btn"
			aria-label="Previsualizar documento"
			on:click|stopPropagation={toggleExpand}
		>
			🔍
		</button>
	{/if}

	<div class="content">
		{#if !loading && !error && previewHtml}
			<div class="preview-container">
				<div class="preview-box" title={file?.name || ''}>
					<div class="preview-content">
						{@html previewHtml}
					</div>
				</div>
				<p class="file-name">{file?.name || ''}</p>
			</div>
		{:else}
			<div class="fallback-container">
				<div class="word-icon">📝</div>
				<div class="info">
					<div class="name" title={file?.name || ''}>{file?.name || ''}</div>
					{#if loading}
						<div class="status">Cargando vista previa…</div>
					{:else if error}
						<div class="status error">{error}</div>
					{:else}
						<div class="status">Documento Word</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</div>

{#if expanded}
	<!-- Modal de vista previa completa -->
	<div class="modal-backdrop" on:click={toggleExpand}>
		<div class="modal" on:click|stopPropagation>
			<div class="modal-header">
				<h3 class="modal-title">Vista previa del documento</h3>
				<div class="modal-actions">
					<button
						class="close-btn"
						on:click|stopPropagation={toggleExpand}
						aria-label="Cerrar modal">Cerrar</button
					>
				</div>
			</div>
			<div class="modal-body">
				{#if previewHtml}
					<div class="document-preview">
						{@html previewHtml}
					</div>
				{:else}
					<div class="loading">Generando vista previa…</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.word-bubble {
		width: 100%;
		height: 100%;
		border-radius: 16px;
		border: 1px solid rgba(255, 255, 255, 0.2);
		background: var(--bg);
		box-shadow: 0 8px 20px rgba(0, 0, 0, 0.5);
		position: relative;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
	.expand-btn {
		position: absolute;
		left: 6px;
		top: 6px;
		width: 24px;
		height: 24px;
		border-radius: 999px;
		border: none;
		background: var(--accent);
		color: var(--bg);
		font-weight: 700;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
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
		background: var(--accent);
		color: var(--bg);
		font-weight: 700;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
		cursor: pointer;
		z-index: 2;
	}
	.content {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 20px;
		color: var(--fg);
	}
	.word-icon {
		width: 64px;
		height: 64px;
		border-radius: 12px;
		background: var(--accent);
		color: var(--bg);
		font-size: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 6px 18px rgba(255, 121, 198, 0.35);
	}
	.preview-container {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 12px;
	}
	.preview-box {
		width: 60%;
		max-height: 90px;
		border-radius: 8px;
		border: 1px solid rgba(255, 255, 255, 0.2);
		background: #fff;
		overflow: hidden;
		position: relative;
		display: flex;
		align-items: flex-start;
		box-shadow: 0 6px 16px rgba(0, 0, 0, 0.06);
		margin: 0;
	}
	.preview-content {
		width: 100%;
		padding: 12px;
		font-size: 10px;
		line-height: 1.4;
		color: #333;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.preview-content :global(h1) {
		font-size: 14px;
		margin: 0 0 8px 0;
	}
	.preview-content :global(h2) {
		font-size: 12px;
		margin: 0 0 6px 0;
	}
	.preview-content :global(h3) {
		font-size: 11px;
		margin: 0 0 4px 0;
	}
	.preview-content :global(p) {
		margin: 0 0 6px 0;
	}
	.preview-btn {
		position: absolute;
		left: 6px;
		top: 6px;
		width: 28px;
		height: 28px;
		border-radius: 999px;
		border: none;
		background: rgba(255, 255, 255, 0.15);
		backdrop-filter: blur(10px);
		color: var(--fg);
		font-size: 16px;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		cursor: pointer;
		z-index: 3;
		transition: all 0.2s ease;
	}
	.preview-btn:hover {
		background: rgba(255, 255, 255, 0.25);
		transform: scale(1.1);
	}
	.file-name {
		margin-top: 4px;
		font-size: 13px;
		font-weight: 600;
		color: var(--fg);
		white-space: nowrap;
		text-overflow: ellipsis;
		overflow: hidden;
		width: 100%;
		text-align: center;
	}
	.info {
		display: flex;
		flex-direction: column;
		gap: 4px;
		overflow: hidden;
	}
	.name {
		font-weight: 600;
		color: var(--fg);
		white-space: nowrap;
		text-overflow: ellipsis;
		overflow: hidden;
		max-width: 120px;
	}
	.status {
		color: var(--fg);
		font-size: 12px;
	}
	.status.error {
		color: var(--accent);
	}
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(15, 23, 42, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 50;
		padding: 12px;
	}
	.modal {
		background: var(--bg);
		border-radius: 12px;
		border: 1px solid rgba(0, 0, 0, 0.08);
		box-shadow: 0 12px 36px rgba(0, 0, 0, 0.25);
		width: min(900px, 96vw);
		max-height: min(80vh, 900px);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 16px;
		border-bottom: 1px solid rgba(0, 0, 0, 0.06);
		background: var(--header-bg);
		color: var(--fg);
	}
	.modal-title {
		margin: 0;
		font-size: 14px;
		color: var(--fg);
		font-weight: 700;
	}
	.modal-actions {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.close-btn {
		background: var(--accent);
		color: var(--bg);
		border: none;
		padding: 6px 10px;
		border-radius: 8px;
		font-size: 12px;
		font-weight: 700;
		box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
		cursor: pointer;
	}
	.modal-body {
		padding: 24px;
		overflow: auto;
		background: #fff;
	}
	.loading {
		color: #64748b;
		padding: 8px;
	}
	.document-preview {
		max-width: 800px;
		margin: 0 auto;
		padding: 20px;
		background: #fff;
		color: #333;
		line-height: 1.6;
	}
	.document-preview :global(h1) {
		font-size: 24px;
		margin: 0 0 16px 0;
		color: #000;
	}
	.document-preview :global(h2) {
		font-size: 20px;
		margin: 16px 0 12px 0;
		color: #000;
	}
	.document-preview :global(h3) {
		font-size: 16px;
		margin: 12px 0 8px 0;
		color: #000;
	}
	.document-preview :global(p) {
		margin: 0 0 12px 0;
		color: #333;
	}
	.document-preview :global(ul),
	.document-preview :global(ol) {
		margin: 0 0 12px 0;
		padding-left: 24px;
	}
	.document-preview :global(li) {
		margin: 4px 0;
	}
	.document-preview :global(strong) {
		font-weight: 700;
	}
	.document-preview :global(em) {
		font-style: italic;
	}
	.document-preview :global(img) {
		max-width: 100%;
		height: auto;
		margin: 12px 0;
	}
</style>
