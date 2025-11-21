<script lang="ts">
	import { onMount } from 'svelte';
	import FileDropzone from '$lib/components/FileDropzone.svelte';
	import ImageCropModal from '$lib/components/ImageCropModal.svelte';
	import FileList from '$lib/components/FileList.svelte';
	import ImageCropperModal from '$lib/components/ImageCropperModal.svelte';
	import { getFileType } from '$lib/utils/fileTypes';
	import { mergeToPdf } from '$lib/utils/mergeToPdf';

	let files: File[] = [];
	let editorFile: File | null = null;
	let processing = false;
	let showLoader = true; // Mostrar loader al inicio
	let toastMsg = '';
	let showToast = false;

	// Ocultar loader después de que la página cargue
	onMount(() => {
		setTimeout(() => {
			showLoader = false;
		}, 2000); // 2 segundos
	});

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

	function handleFilesUnlocked(e: CustomEvent<{ original: File; pages: File[] }>) {
		const { original, pages } = e.detail;
		files = files.filter((f) => f !== original);
		files = [...files, ...pages];
		notify('PDF desbloqueado en páginas individuales');
	}

	function handleReorder(e: CustomEvent<{ files: File[] }>) {
		files = e.detail.files;
	}

	function openEditor(file: File) {
		editorFile = file;
	}

	function saveEditedImage(blob: Blob) {
		const edited = new File([blob], editorFile!.name, { type: blob.type });
		files = files.map((f) => (f === editorFile ? edited : f));
	}

	function removeFile(file: File) {
		files = files.filter((f) => f !== file);
	}

	async function processAll() {
		if (!files.length || processing) return;
		processing = true;
		showLoader = true;

		// Mostrar loader durante 2 segundos
		await new Promise((resolve) => setTimeout(resolve, 2000));

		showLoader = false;

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

<FileDropzone
	on:filesAdded={handleFilesAdded}
	on:filesUnlocked={handleFilesUnlocked}
	on:reorder={handleReorder}
	{files}
	onEditImage={openEditor}
	onRemoveFile={removeFile}
/>

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
	{processing ? 'PROCESANDO…' : 'PROCESAR'}
</button>

{#if showLoader}
	<div class="loader-overlay">
		<div class="white-veil"></div>
		<div class="sun-circle-5"></div>
		<div class="sun-circle-4"></div>
		<div class="sun-circle-3"></div>
		<div class="outer-circle">
			<div class="inner-circle">
				<video autoplay loop muted playsinline class="loader-video">
					<source src="/Load.mp4" type="video/mp4" />
				</video>
			</div>
		</div>
	</div>
{/if}

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
		box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
		cursor: pointer;
	}
	.procesar:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.loader-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 2000;
	}

	.white-veil {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(255, 255, 255, 0.5);
		z-index: 1;
	}

	.outer-circle {
		width: 550px;
		height: 550px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.4);
		display: flex;
		align-items: center;
		justify-content: center;
		position: absolute;
		z-index: 2;
	}

	.inner-circle {
		width: 400px;
		height: 400px;
		border-radius: 50%;
		background: rgb(225, 227, 230);
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
	}

	.sun-circle-3 {
		position: absolute;
		width: 700px;
		height: 700px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.25);
		z-index: 1;
	}

	.sun-circle-4 {
		position: absolute;
		width: 850px;
		height: 850px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.15);
		z-index: 1;
	}

	.sun-circle-5 {
		position: absolute;
		width: 1000px;
		height: 1000px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.08);
		z-index: 1;
	}

	.loader-video {
		max-width: 300px;
		max-height: 300px;
		border-radius: 50%;
		object-fit: cover;
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
		box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18);
		font-weight: 700;
		letter-spacing: 0.2px;
		opacity: 1;
		animation: fadeOut 4s ease forwards;
	}

	@keyframes fadeOut {
		0% {
			opacity: 1;
			transform: translate(-50%, -50%) scale(1);
		}
		100% {
			opacity: 0;
			transform: translate(-50%, -50%) scale(0.98);
		}
	}
</style>
