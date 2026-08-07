<script lang="ts">
	import { Button } from "$lib/components/ui/button/index.js";
	import * as Dialog from "$lib/components/ui/dialog/index.js";

	type Props = {
		open: boolean;
		onConfirm: () => void | Promise<void>;
		loading?: boolean;
	};

	let { open = $bindable(false), onConfirm, loading = false }: Props = $props();
</script>

<Dialog.Root bind:open>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Delete record</Dialog.Title>
			<Dialog.Description>
				This action cannot be undone. The record will be permanently deleted.
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (open = false)} disabled={loading}>Cancel</Button>
			<Button
				variant="destructive"
				disabled={loading}
				onclick={() => {
					void onConfirm();
				}}
			>
				{loading ? "Deleting…" : "Delete"}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
