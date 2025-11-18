<script lang="ts">
	import FileThumbnail from './FileThumbnail.svelte';
	import { getFileType } from '$lib/utils/fileTypes';

	export let files: File[] = [];
	export let onEditImage: (file: File) => void;
</script>

<div class="list">
	{#each files as f}
		<FileThumbnail file={f} fileType={getFileType(f)} onEdit={onEditImage} />
	{/each}
</div>

<style>
	.list {
		display: flex;
		gap: 20px;
		flex-wrap: wrap;
		color: var(--fg);
	}
</style>
