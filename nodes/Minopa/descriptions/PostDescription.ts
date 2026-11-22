import type { INodeProperties } from 'n8n-workflow';

const show = (operation: string[]) => ({ show: { resource: ['post'], operation } });

export const postOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['post'] } },
		options: [
			{ name: 'Create', value: 'create', action: 'Create a post', description: 'Save a draft, schedule a post or publish it now' },
			{ name: 'Delete', value: 'delete', action: 'Delete a post', description: 'Delete a post from Minopa (content already on the network stays)' },
			{ name: 'Get', value: 'get', action: 'Get a post', description: 'Get a post with its status' },
			{ name: 'Get Many', value: 'getAll', action: 'Get many posts', description: 'List posts, newest first' },
			{ name: 'Get Metrics', value: 'getMetrics', action: 'Get post metrics', description: 'Get views, likes and other metrics of a published post' },
			{ name: 'Get Stats', value: 'getStats', action: 'Get post stats', description: 'Count posts by status' },
			{ name: 'Publish', value: 'publish', action: 'Publish a post', description: 'Publish a draft or scheduled post right away' },
			{ name: 'Update', value: 'update', action: 'Update a post', description: 'Change a draft or scheduled post' },
		],
		default: 'create',
	},
];

const accountField: INodeProperties = {
	displayName: 'Social Account Name or ID',
	name: 'accountId',
	type: 'options',
	typeOptions: { loadOptionsMethod: 'getSocialAccounts' },
	required: true,
	default: '',
	description:
		'The connected account to post to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
};

const postIdField = (operation: string[]): INodeProperties => ({
	displayName: 'Post ID',
	name: 'postId',
	type: 'string',
	required: true,
	default: '',
	displayOptions: show(operation),
});

const optionalPostFields: INodeProperties[] = [
	{
		displayName: 'Alt Text',
		name: 'altText',
		type: 'string',
		default: '',
		description: 'Accessibility text for the media (Instagram, Threads, Pinterest)',
	},
	{
		displayName: 'Board ID',
		name: 'boardId',
		type: 'string',
		default: '',
		description: 'Pinterest board to pin to (required for Pinterest)',
	},
	{
		displayName: 'Category ID',
		name: 'categoryId',
		type: 'string',
		default: '',
		description: 'YouTube video category',
	},
	{
		displayName: 'Extra Platform Fields (JSON)',
		name: 'platformFields',
		type: 'json',
		default: '{}',
		description:
			'Any other field the platform accepts, merged last, e.g. {"shareToFeed": false} for an Instagram reel. See the API reference for each platform\'s fields.',
	},
	{
		displayName: 'Link',
		name: 'link',
		type: 'string',
		default: '',
		description: 'Link for the post (Facebook text posts, Pinterest destination)',
	},
	{
		displayName: 'Made for Kids',
		name: 'madeForKids',
		type: 'boolean',
		default: false,
		description: 'Whether the YouTube video is made for kids (required for YouTube)',
	},
	{
		displayName: 'Note to Reviewers',
		name: 'note',
		type: 'string',
		default: '',
		description: 'Shown to approvers when the workspace requires post approval',
	},
	{
		displayName: 'Playlist ID',
		name: 'playlistId',
		type: 'string',
		default: '',
		description: 'YouTube playlist to add the video to',
	},
	{
		displayName: 'Privacy',
		name: 'privacy',
		type: 'options',
		default: 'PUBLIC_TO_EVERYONE',
		description: 'Who can see the post (TikTok and YouTube; required for both)',
		options: [
			{ name: 'TikTok: Everyone', value: 'PUBLIC_TO_EVERYONE' },
			{ name: 'TikTok: Followers', value: 'FOLLOWER_OF_CREATOR' },
			{ name: 'TikTok: Friends', value: 'MUTUAL_FOLLOW_FRIENDS' },
			{ name: 'TikTok: Only Me', value: 'SELF_ONLY' },
			{ name: 'YouTube: Private', value: 'private' },
			{ name: 'YouTube: Public', value: 'public' },
			{ name: 'YouTube: Unlisted', value: 'unlisted' },
		],
	},
	{
		displayName: 'Tags',
		name: 'tags',
		type: 'string',
		default: '',
		description: 'Comma-separated hashtags or keywords, without #',
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		description: 'Title for YouTube videos, Pinterest pins, TikTok photo posts and Facebook reels',
	},
];

export const postFields: INodeProperties[] = [
	/* ------------------------------ create ------------------------------ */
	{ ...accountField, displayOptions: show(['create']) },
	{
		displayName: 'Post Type Name or ID',
		name: 'postType',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getPostTypes', loadOptionsDependsOn: ['accountId'] },
		required: true,
		default: '',
		displayOptions: show(['create']),
		description:
			'The kind of post for this account\'s platform. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Caption',
		name: 'caption',
		type: 'string',
		typeOptions: { rows: 4 },
		default: '',
		displayOptions: show(['create']),
		description: 'Post text. For YouTube it becomes the video description.',
	},
	{
		displayName: 'Media IDs',
		name: 'mediaIds',
		type: 'string',
		default: '',
		displayOptions: show(['create']),
		description:
			'Comma-separated IDs from the media library, e.g. the ID returned by Media → Upload. Required for image and video posts.',
	},
	{
		displayName: 'When',
		name: 'when',
		type: 'options',
		default: 'draft',
		displayOptions: show(['create']),
		options: [
			{ name: 'Save as Draft', value: 'draft' },
			{ name: 'Schedule', value: 'schedule' },
			{ name: 'Publish Now', value: 'now', description: 'Publishes right away; it is public on the network' },
		],
	},
	{
		displayName: 'Scheduled Time',
		name: 'scheduledTime',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['post'], operation: ['create'], when: ['schedule'] } },
		description: 'When to publish. Must be in the future.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['create']),
		options: optionalPostFields,
	},

	/* ------------------------------ get / delete / publish / metrics ------------------------------ */
	postIdField(['get', 'delete', 'publish', 'getMetrics', 'update']),

	/* ------------------------------ update ------------------------------ */
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['update']),
		options: [
			{ displayName: 'Caption', name: 'caption', type: 'string', typeOptions: { rows: 4 }, default: '' },
			{
				displayName: 'Media IDs',
				name: 'mediaIds',
				type: 'string',
				default: '',
				description: 'Comma-separated media library IDs; replaces the current media',
			},
			{
				displayName: 'Scheduled Time',
				name: 'scheduledTime',
				type: 'dateTime',
				default: '',
				description: 'Schedule or reschedule the post',
			},
			...optionalPostFields.filter((f) => f.name !== 'note'),
		],
	},

	/* ------------------------------ getAll ------------------------------ */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: show(['getAll']),
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 50,
		displayOptions: { show: { resource: ['post'], operation: ['getAll'], returnAll: [false] } },
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: show(['getAll']),
		options: [
			{
				displayName: 'Social Account Name or ID',
				name: 'connectionId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getSocialAccounts' },
				default: '',
				description:
					'Only posts of this account. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Text to search for in captions',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'multiOptions',
				default: [],
				options: [
					{ name: 'Archived', value: 'archived' },
					{ name: 'Cancelled', value: 'cancelled' },
					{ name: 'Draft', value: 'draft' },
					{ name: 'Pending Approval', value: 'pending' },
					{ name: 'Published', value: 'published' },
					{ name: 'Publishing', value: 'publishing' },
					{ name: 'Rejected', value: 'rejected' },
					{ name: 'Scheduled', value: 'scheduled' },
				],
			},
		],
	},
];
