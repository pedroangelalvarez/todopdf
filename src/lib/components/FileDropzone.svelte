<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import FileThumbnail from './FileThumbnail.svelte';
	import { getFileType } from '$lib/utils/fileTypes';
	import PdfGroupBubble from './PdfGroupBubble.svelte';

	export let files: File[] = [];
	export let onEditImage: (file: File) => void = () => {};
	export let onRemoveFile: (file: File) => void = () => {};

	const dispatch = createEventDispatcher();

	function handleUnlock(original: File, pages: File[]) {
		dispatch('filesUnlocked', { original, pages });
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		const files = Array.from(e.dataTransfer?.files || []);
		dispatch('filesAdded', { files });
	}

	function handleSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const files = Array.from(input.files || []);
		dispatch('filesAdded', { files });
	}

	function triggerSelect() {
		const input = document.getElementById('file-input') as HTMLInputElement | null;
		input?.click();
	}

	// Reordenar arrastrando burbujas dentro de la cuadrícula
	let dragIndex: number | null = null;
	function onDragStart(index: number, e: DragEvent) {
		dragIndex = index;
		try {
			e.dataTransfer?.setData('text/plain', String(index));
			if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
		} catch {}
	}
	function onDrop(targetIndex: number) {
		if (dragIndex === null || dragIndex === targetIndex) return;
		const next = [...files];
		const [moved] = next.splice(dragIndex, 1);
		next.splice(targetIndex, 0, moved);
		dragIndex = null;
		dispatch('reorder', { files: next });
	}
	function onDragEnd() {
		dragIndex = null;
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
				{#each files as f, i (f.name + '-' + f.size + '-' + f.lastModified)}
					<div
						class="bubble-wrap"
						draggable="true"
						on:dragstart={(e) => onDragStart(i, e)}
						on:dragover|preventDefault|stopPropagation
						on:drop|stopPropagation={() => onDrop(i)}
						on:dragend={onDragEnd}
					>
						{#if getFileType(f) === 'pdf'}
							<PdfGroupBubble
								file={f}
								onRemove={onRemoveFile}
								on:unlock={(e) => handleUnlock(f, e.detail.pages)}
							/>
						{:else}
							<FileThumbnail
								file={f}
								fileType={getFileType(f)}
								onEdit={onEditImage}
								onRemove={onRemoveFile}
							/>
						{/if}
					</div>
				{/each}
			{/if}
		</div>
	</div>

	<input
		id="file-input"
		type="file"
		multiple
		accept="application/pdf,.docx,image/jpeg,image/png,image/webp"
		on:change={handleSelect}
	/>
</div>

<style>
	.dropzone {
		margin: 40px auto;
		min-height: 75vh;
		min-width: calc(100vw - 3vw);
		border-radius: 16px;
		border: 1px solid rgba(0, 0, 0, 0.2);
		background: var(--bg);
		color: var(--fg);
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
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
		color: var(--accent);
		font-weight: 600;
		margin-bottom: 16px;
	}
	.icon {
		font-size: 20px;
	}
	.preview-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
		grid-auto-rows: 160px;
		gap: 16px;
		align-items: stretch;
	}
	.empty {
		color: var(--fg);
	}
	input[type='file'] {
		display: none;
	}
</style>
