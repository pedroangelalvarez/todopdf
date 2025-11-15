<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { browser } from "$app/environment";

  export let file: File;
  export let onClose: () => void;
  export let onSave: (croppedBlob: Blob) => void;

  let imgEl: HTMLImageElement;
  let cropper: any;
  let previewUrl: string | null = null;

  onMount(async () => {
    if (!browser) return;

    const module = await import("cropperjs");

    previewUrl = URL.createObjectURL(file);
    const options = {
      aspectRatio: NaN,
      viewMode: 1
    } as any;

    cropper = new module.default(imgEl, options);
  });

  onDestroy(() => {
    try {
      cropper?.destroy();
    } catch {}
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      previewUrl = null;
    }
  });

  function saveImage() {
    cropper.getCroppedCanvas().toBlob((blob: Blob | null) => {
      if (blob) {
        onSave(blob);
      }
      onClose();
    });
  }
</script>

<div class="modal">
  <img bind:this={imgEl} src={previewUrl ?? ''} />

  <button on:click={saveImage}>Guardar</button>
  <button on:click={onClose}>Cancelar</button>
</div>

<style>
.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: white;
  padding: 20px;
}
</style>