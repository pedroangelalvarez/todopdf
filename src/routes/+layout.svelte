<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<header class="header">
	<img src="/logo.png" alt="Logo" class="logo" />
</header>

{@render children()}

<style>
	:root {
		--bg: #1a1f3a;
		--fg: #f8f8f2;
		--header-bg: #2a2f4a;
		--accent: #ff79c6;
	}
	:global(html) {
		background-color: var(--bg);
		min-height: 100vh;
	}
	:global(body) {
		background-color: var(--bg);
		color: var(--fg);
		margin: 0;
		padding: 0;
		font-family: 'Inter', sans-serif;
		min-height: 100vh;
	}
	.header {
		display: flex;
		align-items: center;
		padding: 0.5rem 1rem;
		background-color: var(--header-bg);
	}
	.logo {
		height: 40px;
		width: auto;
	}
	:global(a) {
		color: var(--accent);
	}
</style>
