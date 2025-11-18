<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	export let file: File;
	export let onClose: () => void;
	export let onSave: (blob: Blob) => void;

	let imgUrl = '';
	let imgEl: HTMLImageElement;
	let containerEl: HTMLDivElement;

	let selecting = false;
	let startX = 0,
		startY = 0;
	let endX = 0,
		endY = 0;

	function onMouseDown(e: MouseEvent) {
		selecting = true;
		const rect = containerEl.getBoundingClientRect();
		startX = e.clientX - rect.left;
		startY = e.clientY - rect.top;
		endX = startX;
		endY = startY;
	}

	function onMouseMove(e: MouseEvent) {
		if (!selecting) return;
		const rect = containerEl.getBoundingClientRect();
		endX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
		endY = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
	}

	function onMouseUp() {
		selecting = false;
	}

	function getSelection() {
		const x = Math.min(startX, endX);
		const y = Math.min(startY, endY);
		const w = Math.abs(endX - startX);
		const h = Math.abs(endY - startY);
		return { x, y, w, h };
	}

	async function saveCrop() {
		const sel = getSelection();
		if (sel.w < 2 || sel.h < 2) {
			onClose();
			return;
		}
		const scaleX = imgEl.naturalWidth / imgEl.clientWidth;
		const scaleY = imgEl.naturalHeight / imgEl.clientHeight;
		const offsetLeft = (containerEl.clientWidth - imgEl.clientWidth) / 2;
		const offsetTop = (containerEl.clientHeight - imgEl.clientHeight) / 2;

		const cropX = Math.max(0, sel.x - offsetLeft) * scaleX;
		const cropY = Math.max(0, sel.y - offsetTop) * scaleY;
		const cropW = Math.min(imgEl.clientWidth, sel.w) * scaleX;
		const cropH = Math.min(imgEl.clientHeight, sel.h) * scaleY;

		const canvas = document.createElement('canvas');
		canvas.width = Math.round(cropW);
		canvas.height = Math.round(cropH);
		const ctx = canvas.getContext('2d');
		if (!ctx) {
			onClose();
			return;
		}
		ctx.drawImage(
			imgEl,
			Math.round(cropX),
			Math.round(cropY),
			Math.round(cropW),
			Math.round(cropH),
			0,
			0,
			canvas.width,
			canvas.height
		);

		const blob = await new Promise<Blob | null>((resolve) =>
			canvas.toBlob(resolve, file.type || 'image/png', 1)
		);
		if (blob) onSave(blob);
		onClose();
	}

	function onKeyDown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}

	onMount(() => {
		imgUrl = URL.createObjectURL(file);
	});

	onDestroy(() => {
		if (imgUrl) URL.revokeObjectURL(imgUrl);
	});
</script>

face
<div class="modal-backdrop" tabindex="0" on:keydown={onKeyDown} on:click={onClose}>
	<div class="modal" on:click|stopPropagation>
		<header class="modal-header">Editar imagen</header>
		<div
			class="image-container"
			bind:this={containerEl}
			on:mousedown={onMouseDown}
			on:mousemove={onMouseMove}
			on:mouseup={onMouseUp}
			on:mouseleave={onMouseUp}
		>
			<img class="edit-img" bind:this={imgEl} src={imgUrl} alt="Imagen a recortar" />
			{#if startX !== endX && startY !== endY}
				<div
					class="selection"
					style="left:{Math.min(startX, endX)}px; top:{Math.min(startY, endY)}px; width:{Math.abs(
						endX - startX
					)}px; height:{Math.abs(endY - startY)}px;"
				></div>
			{/if}
		</div>
		<footer class="modal-actions">
			<button class="btn secondary" on:click={onClose}>Cancelar</button>
			<button class="btn primary" on:click={saveCrop}>Guardar recorte</button>
		</footer>
	</div>
</div>

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(2, 6, 23, 0.6);
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
		font-weight: 600;
	}
	.image-container {
		position: relative;
		width: 100%;
		height: min(70vh, 600px);
		background: #0f172a10;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		cursor: crosshair;
	}
	.edit-img {
		max-width: 100%;
		max-height: 100%;
		object-fit: contain;
		user-select: none;
		pointer-events: none;
	}
	.selection {
		position: absolute;
		border: 2px solid #38bdf8;
		background: rgba(56, 189, 248, 0.2);
		box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1) inset;
	}
	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		padding: 12px 16px;
		border-top: 1px solid rgba(0, 0, 0, 0.08);
		background: #f8fafc;
	}
	.btn {
		padding: 8px 12px;
		border-radius: 8px;
		border: none;
		cursor: pointer;
		font-weight: 600;
	}
	.btn.secondary {
		background: #e2e8f0;
		color: #0f172a;
	}
	.btn.primary {
		background: #0ea5e9;
		color: #ffffff;
	}
</style>
