import type { INodeProperties } from 'n8n-workflow';

const MIME_TYPES = [
	'image/jpeg',
	'image/png',
	'image/gif',
	'image/webp',
	'video/mp4',
	'video/webm',
	'video/quicktime',
];

const returnAllAndLimit = (resource: string, operation: string): INodeProperties[] => [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: [resource], operation: [operation] } },
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 50,
		displayOptions: { show: { resource: [resource], operation: [operation], returnAll: [false] } },
		description: 'Max number of results to return',
	},
];

/* ================================== Media ================================== */

export const mediaOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['media'] } },
		options: [
			{ name: 'Get', value: 'get', action: 'Get a media file', description: 'Get a media file and its processing status' },
			{ name: 'Get Many', value: 'getAll', action: 'Get many media files', description: 'List files in the media library' },
			{ name: 'Upload', value: 'upload', action: 'Upload a media file', description: 'Upload an image or video from binary data to the media library' },
		],
		default: 'upload',
	},
];

export const mediaFields: INodeProperties[] = [
	{
		displayName: 'Input Binary Field',
		name: 'binaryPropertyName',
		type: 'string',
		required: true,
		default: 'data',
		displayOptions: { show: { resource: ['media'], operation: ['upload'] } },
		hint: 'The name of the input binary field containing the file to upload',
	},
	{
		displayName: 'Options',
		name: 'uploadOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { resource: ['media'], operation: ['upload'] } },
		options: [
			{
				displayName: 'File Name',
				name: 'fileName',
				type: 'string',
				default: '',
				description: 'Name for the file in the library. Defaults to the binary file name.',
			},
			{
				displayName: 'Folder ID',
				name: 'folderId',
				type: 'string',
				default: '',
				description: 'Media folder to put the file in (plans with media folders)',
			},
			{
				displayName: 'Wait Until Processed',
				name: 'waitForProcessing',
				type: 'boolean',
				default: true,
				description:
					'Whether to wait (up to about 2 minutes) until Minopa has processed the file, so it can be used in a post right away',
			},
		],
	},
	{
		displayName: 'Media ID',
		name: 'mediaId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['media'], operation: ['get'] } },
	},
	...returnAllAndLimit('media', 'getAll'),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { resource: ['media'], operation: ['getAll'] } },
		options: [
			{ displayName: 'Folder ID', name: 'folderId', type: 'string', default: '' },
			{
				displayName: 'MIME Type',
				name: 'mimeType',
				type: 'options',
				default: 'image/jpeg',
				options: MIME_TYPES.map((t) => ({ name: t, value: t })),
			},
		],
	},
];

/* ============================== Social account ============================== */

export const socialAccountOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['socialAccount'] } },
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many social accounts',
				description: 'List the social accounts connected to the workspace',
			},
		],
		default: 'getAll',
	},
];

/* ================================ Workspace ================================ */

export const workspaceOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['workspace'] } },
		options: [
			{ name: 'Get', value: 'get', action: 'Get the workspace', description: 'Get the workspace this API key belongs to' },
			{ name: 'Get Usage', value: 'getUsage', action: 'Get workspace usage', description: 'Get usage and plan limits' },
		],
		default: 'get',
	},
];

/* ================================ Analytics ================================ */

export const analyticsOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['analytics'] } },
		options: [
			{ name: 'Get Best Times', value: 'getBestTimes', action: 'Get the best times to post', description: 'Get the hours and days with the most engagement' },
			{ name: 'Get Overview', value: 'getOverview', action: 'Get an analytics overview', description: 'Get totals for views, engagement and followers' },
			{ name: 'Get Top Posts', value: 'getTopPosts', action: 'Get top posts', description: 'Get the posts that performed best' },
		],
		default: 'getOverview',
	},
];

export const analyticsFields: INodeProperties[] = [
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { resource: ['analytics'] } },
		options: [
			{
				displayName: 'Format',
				name: 'format',
				type: 'options',
				default: 'video',
				options: [
					{ name: 'Image', value: 'image' },
					{ name: 'Short', value: 'short' },
					{ name: 'Text', value: 'text' },
					{ name: 'Video', value: 'video' },
				],
			},
			{ displayName: 'From', name: 'from', type: 'dateTime', default: '', description: 'Start of the period' },
			{
				displayName: 'Social Account Names or IDs',
				name: 'accountIds',
				type: 'multiOptions',
				typeOptions: { loadOptionsMethod: 'getSocialAccounts' },
				default: [],
				description:
					'Only these accounts. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Sort',
				name: 'sort',
				type: 'options',
				default: 'typical',
				description: 'How to rank posts (top posts only)',
				options: [
					{ name: 'Interactions', value: 'interactions' },
					{ name: 'Recent', value: 'recent' },
					{ name: 'Typical', value: 'typical' },
					{ name: 'Views', value: 'views' },
				],
			},
			{ displayName: 'To', name: 'to', type: 'dateTime', default: '', description: 'End of the period' },
		],
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 50,
		displayOptions: { show: { resource: ['analytics'], operation: ['getTopPosts'] } },
		description: 'Max number of results to return',
	},
];
