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
	let singleThumbUrl: string = '';
	let workerRef: Worker | null = null;
	let bubbleEl: HTMLDivElement | null = null;
	let rowSpan = 1;
	let unlocked = false;
	let zoomLevel = 1; // 1 = 100%
	const MIN_ZOOM = 0.5; // 50%
	const MAX_ZOOM = 3; // 300%
	const ZOOM_STEP = 0.25; // 25% por clic

	// Variables para panning
	let panX = 0;
	let panY = 0;
	let isDragging = false;
	let startX = 0;
	let startY = 0;
	let scrollLeft = 0;
	let scrollTop = 0;

	onMount(async () => {
		try {
			const { PDFDocument } = await import('pdf-lib');
			objectUrl = URL.createObjectURL(file);
			const buf = await file.arrayBuffer();
			const pdfDoc = await PDFDocument.load(buf);
			numPages = pdfDoc.getPages().length;
			loading = false;
			if (numPages === 1) {
				await renderSinglePreview();
			}
		} catch (e) {
			console.error(e);
			error = 'No se pudo leer el PDF';
			loading = false;
		}
	});

	import { tick, createEventDispatcher } from 'svelte';
	import { splitPdfIntoPages } from '$lib/utils/splitPdf';
	const dispatch = createEventDispatcher();
	async function toggleExpand() {
		expanded = !expanded;
		if (expanded && !thumbsLoaded && numPages > 1) {
			renderThumbnails();
		}
		// Resetear zoom y panning al cerrar el modal
		if (!expanded) {
			zoomLevel = 1;
			panX = 0;
			panY = 0;
		}
		// El modal no necesita ajustar el span del grid
		rowSpan = 1;
	}

	function zoomIn() {
		if (zoomLevel < MAX_ZOOM) {
			zoomLevel = Math.min(zoomLevel + ZOOM_STEP, MAX_ZOOM);
		}
	}

	function zoomOut() {
		if (zoomLevel > MIN_ZOOM) {
			zoomLevel = Math.max(zoomLevel - ZOOM_STEP, MIN_ZOOM);
		}
	}

	function resetZoom() {
		zoomLevel = 1;
	}

	function handleWheel(event: WheelEvent) {
		event.preventDefault();
		if (event.deltaY < 0) {
			zoomIn();
		} else {
			zoomOut();
		}
	}

	function handleMouseDown(event: MouseEvent) {
		const container = event.currentTarget as HTMLElement;
		isDragging = true;
		startX = event.pageX - container.offsetLeft;
		startY = event.pageY - container.offsetTop;
		scrollLeft = panX;
		scrollTop = panY;
	}

	function handleMouseMove(event: MouseEvent) {
		if (!isDragging) return;
		event.preventDefault();
		const container = event.currentTarget as HTMLElement;
		const x = event.pageX - container.offsetLeft;
		const y = event.pageY - container.offsetTop;
		const walkX = x - startX;
		const walkY = y - startY;
		panX = scrollLeft + walkX;
		panY = scrollTop + walkY;
	}

	function handleMouseUp() {
		isDragging = false;
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
				const viewport = page.getViewport({ scale: 1.0 });
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
			await tick();
			updateRowSpan();
		} catch (e) {
			console.error('Error generando miniaturas PDF', e);
		}
	}

	let unlocking = false;
	async function unlockPages() {
		if (unlocking) return;
		unlocking = true;
		try {
			// Oculta inmediatamente la burbuja contenedora
			unlocked = true;
			const pages = await splitPdfIntoPages(file);
			dispatch('unlock', { pages });
			expanded = false;
		} catch (e) {
			console.error('Error desbloqueando PDF', e);
		} finally {
			unlocking = false;
		}
	}

	async function renderSinglePreview() {
		try {
			const pdfjsModule: any = await import('pdfjs-dist');
			const workerUrl = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url);
			const worker = new Worker(workerUrl, { type: 'module' });
			pdfjsModule.GlobalWorkerOptions.workerPort = worker;

			const pdf = await pdfjsModule.getDocument({ url: objectUrl }).promise;
			const page = await pdf.getPage(1);
			const viewport = page.getViewport({ scale: 2.0 });
			const canvas = document.createElement('canvas');
			canvas.width = Math.floor(viewport.width);
			canvas.height = Math.floor(viewport.height);
			const ctx = canvas.getContext('2d');
			if (!ctx) return;
			await page.render({ canvasContext: ctx, viewport }).promise;
			singleThumbUrl = canvas.toDataURL('image/png');
			pdf.destroy();
			worker.terminate();
		} catch (e) {
			console.error('Error generando miniatura única PDF', e);
		}
	}

	// Limpieza en desmontaje
	import { onDestroy } from 'svelte';
	onDestroy(() => {
		if (objectUrl) URL.revokeObjectURL(objectUrl);
		workerRef?.terminate();
		workerRef = null;
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

{#if !unlocked}
	<div
		class="pdf-bubble"
		bind:this={bubbleEl}
		class:expanded
		class:single={!loading && !error && numPages <= 1}
		style="grid-row: span {rowSpan};"
	>
		{#if !loading && !error && numPages > 1}
			<button class="expand-btn" aria-label="Expandir" on:click|stopPropagation={toggleExpand}>
				{#if expanded}–{:else}+{/if}
			</button>
		{/if}
		{#if !loading && !error && numPages === 1 && singleThumbUrl}
			<button
				class="magnify-btn"
				aria-label="Ver previsualización"
				on:click|stopPropagation={toggleExpand}
				title="Ver previsualización"
			>
				🔍
			</button>
		{/if}
		<button
			class="remove-btn"
			aria-label="Quitar PDF"
			on:click|stopPropagation={() => onRemove(file)}>✕</button
		>

		<div class="content">
			{#if !loading && !error && numPages === 1 && singleThumbUrl}
				<div class="single-container">
					<div
						class="single-box"
						title={file?.name || ''}
						on:click|stopPropagation={toggleExpand}
						style="cursor: pointer;"
					>
						<img class="single-img" src={singleThumbUrl} alt={file?.name || 'Vista previa PDF'} />
					</div>
					<p class="single-name">{file?.name || ''}</p>
				</div>
			{:else}
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
			{/if}
		</div>
	</div>

	{#if !unlocked && expanded}
		<!-- Modal de vistas previas -->
		<div class="modal-backdrop" on:click={toggleExpand}>
			<div class="modal" on:click|stopPropagation>
				<div class="modal-header">
					<h3 class="modal-title">
						{numPages === 1 ? 'Vista previa del PDF' : 'Vistas previas del PDF'}
					</h3>
					<div class="modal-actions">
						{#if numPages === 1}
							<!-- Controles de zoom para vista previa de una página -->
							<div class="zoom-controls">
								<button
									class="zoom-btn"
									on:click|stopPropagation={zoomOut}
									disabled={zoomLevel <= MIN_ZOOM}
									aria-label="Alejar"
									title="Alejar (-)">−</button
								>
								<button
									class="zoom-reset-btn"
									on:click|stopPropagation={resetZoom}
									aria-label="Restablecer zoom"
									title="100%">{Math.round(zoomLevel * 100)}%</button
								>
								<button
									class="zoom-btn"
									on:click|stopPropagation={zoomIn}
									disabled={zoomLevel >= MAX_ZOOM}
									aria-label="Acercar"
									title="Acercar (+)">+</button
								>
							</div>
						{/if}
						{#if numPages > 1}
							<button
								class="unlock-btn"
								on:click|stopPropagation={unlockPages}
								disabled={unlocking}
								aria-label="Desbloquear páginas"
							>
								{unlocking ? 'Desbloqueando…' : 'Desbloquear'}
							</button>
						{/if}
						<button
							class="close-btn"
							on:click|stopPropagation={toggleExpand}
							aria-label="Cerrar modal">Cerrar</button
						>
					</div>
				</div>
				<div class="modal-body">
					{#if numPages === 1 && singleThumbUrl}
						<!-- Vista previa ampliada para PDF de una página -->
						<div
							class="single-page-preview"
							on:wheel={handleWheel}
							on:mousedown={handleMouseDown}
							on:mousemove={handleMouseMove}
							on:mouseup={handleMouseUp}
							on:mouseleave={handleMouseUp}
						>
							<div
								class="zoom-container"
								style="transform: scale({zoomLevel}) translate({panX / zoomLevel}px, {panY /
									zoomLevel}px); transform-origin: center center;"
							>
								<img
									src={singleThumbUrl}
									alt={file?.name || 'Vista previa PDF'}
									draggable="false"
								/>
							</div>
						</div>
					{:else if !thumbsLoaded}
						<div class="loading">Generando miniaturas…</div>
					{:else}
						<div class="pages-grid">
							{#each thumbUrls as url, i}
								<div class="page-box" title={`Página ${i + 1}`}>
									<img src={url} alt={`Página ${i + 1}`} />
									<div class="page-index">{i + 1}</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}
{/if}

<style>
	.pdf-bubble {
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
	.magnify-btn {
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
		z-index: 2;
		transition: all 0.2s ease;
	}
	.magnify-btn:hover {
		background: rgba(255, 255, 255, 0.25);
		transform: scale(1.1);
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
	.pdf-icon {
		width: 64px;
		height: 64px;
		border-radius: 12px;
		background: var(--accent);
		color: var(--bg);
		font-weight: 800;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 6px 18px rgba(255, 121, 198, 0.35);
	}
	.single-container {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		padding: 16px;
	}
	.single-box {
		width: 75%;
		aspect-ratio: 1 / 1;
		border-radius: 16px;
		border: 1px solid rgba(255, 255, 255, 0.2);
		background: var(--bg);
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 6px 16px rgba(0, 0, 0, 0.06);
		margin: 0;
	}
	.single-img {
		width: 100%;
		height: 100%;
		object-fit: contain;
		display: block;
	}
	.single-name {
		margin-top: 8px;
		font-size: 12px;
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
	.pages {
		color: var(--fg);
		font-size: 12px;
	}
	.pages.error {
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
	.unlock-btn,
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
	.unlock-btn:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}
	.zoom-controls {
		display: flex;
		align-items: center;
		gap: 4px;
		background: rgba(255, 255, 255, 0.1);
		padding: 4px;
		border-radius: 8px;
	}
	.zoom-btn {
		background: var(--accent);
		color: var(--bg);
		border: none;
		width: 28px;
		height: 28px;
		border-radius: 6px;
		font-size: 16px;
		font-weight: 700;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.2s ease;
	}
	.zoom-btn:hover:not(:disabled) {
		transform: scale(1.1);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
	}
	.zoom-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.zoom-reset-btn {
		background: rgba(255, 255, 255, 0.15);
		color: var(--fg);
		border: none;
		padding: 4px 10px;
		border-radius: 6px;
		font-size: 11px;
		font-weight: 600;
		min-width: 50px;
		cursor: pointer;
		transition: all 0.2s ease;
	}
	.zoom-reset-btn:hover {
		background: rgba(255, 255, 255, 0.25);
	}
	.modal-body {
		padding: 12px;
		overflow: auto;
	}
	.loading {
		color: #64748b;
		padding: 8px;
	}
	.pages-grid {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 8px;
		align-items: stretch;
	}
	.page-box {
		position: relative;
		border: 1px solid rgba(0, 0, 0, 0.08);
		border-radius: 8px;
		overflow: hidden;
		background: #f8fafc;
		aspect-ratio: 1 / 1;
	}
	.page-box img {
		width: 100%;
		height: 100%;
		display: block;
		object-fit: contain;
	}
	.page-index {
		position: absolute;
		right: 6px;
		bottom: 4px;
		background: rgba(15, 23, 42, 0.6);
		color: #fff;
		padding: 2px 6px;
		border-radius: 999px;
		font-size: 11px;
	}
	.single-page-preview {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 20px;
		max-height: 70vh;
		overflow: hidden;
		cursor: grab;
	}
	.single-page-preview:active {
		cursor: grabbing;
	}
	.zoom-container {
		transition: transform 0.2s ease;
		display: inline-block;
	}
	.zoom-container img {
		max-width: 100%;
		max-height: 70vh;
		object-fit: contain;
		border-radius: 8px;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
		display: block;
		user-select: none;
		pointer-events: none;
	}
</style>
