export type AiChatThread = {
	id: string;
	title: string;
	preview?: string;
	updatedAt?: string;
};

export type CreateChatThreadInput = {
	id?: string;
	title?: string;
	preview?: string;
	updatedAt?: string;
};

export type UpdateChatThreadPatch = Partial<Pick<AiChatThread, "title" | "preview" | "updatedAt">>;

export type MaybePromise<T> = T | Promise<T>;

export type LocalChatStorageOptions = {
	keyPrefix?: string;
	initialThreads?: AiChatThread[];
};
