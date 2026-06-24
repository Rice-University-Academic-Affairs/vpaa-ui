export type ColumnStyle = "title" | "text" | "metric" | "tag";

export type Column = {
	field: string;
	label?: string;
	style?: ColumnStyle;
	searchable?: boolean;
	filterable?: boolean;
	sortable?: boolean;
	labels?: Record<string, string>;
};

export type DataTableSearch = {
	columns: string[];
	placeholder?: string;
};

export type DataTableFilterOption = {
	label: string;
	value: string;
	variant?: "tag-success" | "tag-info" | "tag-warning" | "tag-danger" | "tag-neutral";
};

export type DataTableFilter = {
	column: string;
	label: string;
	options: DataTableFilterOption[];
};

export type FilterState = Record<string, string[]>;
