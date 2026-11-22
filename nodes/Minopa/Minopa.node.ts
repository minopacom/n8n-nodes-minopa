import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError, sleep } from 'n8n-workflow';

import {
	getAccountPlatform,
	minopaApiRequest,
	minopaApiRequestAllItems,
	PLATFORM_LABELS,
	POST_TYPES,
	setMedia,
	soonIso,
	splitList,
} from './GenericFunctions';
import { postFields, postOperations } from './descriptions/PostDescription';
import {
	analyticsFields,
	analyticsOperations,
	mediaFields,
	mediaOperations,
	socialAccountOperations,
	workspaceOperations,
} from './descriptions/OtherDescriptions';

/** Turns the optional post fields from the UI into the platform's field object. */
function buildPlatformFields(
	ctx: IExecuteFunctions,
	itemIndex: number,
	platform: string,
	options: IDataObject,
): IDataObject {
	const fields: IDataObject = {};

	if (options.title) fields.title = options.title;
	if (options.link) {
		if (platform === 'threads') fields.linkAttachment = options.link;
		else fields.link = options.link;
	}
	if (options.tags) fields.tags = splitList(options.tags);
	if (options.boardId) fields.boardId = options.boardId;
	if (options.categoryId) fields.categoryId = options.categoryId;
	if (options.playlistId) fields.playlistId = options.playlistId;
	if (options.privacy) {
		if (platform === 'tiktok') fields.privacyLevel = options.privacy;
		if (platform === 'youtube') fields.privacyStatus = options.privacy;
	}
	if (platform === 'youtube' && options.madeForKids !== undefined) {
		fields.madeForKids = options.madeForKids;
	}

	if (options.platformFields) {
		let extra = options.platformFields;

		if (typeof extra === 'string') {
			try {
				extra = JSON.parse(extra || '{}');
			} catch {
				throw new NodeOperationError(ctx.getNode(), 'Extra Platform Fields must be valid JSON', {
					itemIndex,
				});
			}
		}
		Object.assign(fields, extra as IDataObject);
	}

	return fields;
}

/** YouTube takes the caption as the video description. */
function setCaption(platform: string, fields: IDataObject, caption: string): void {
	if (!caption) return;
	if (platform === 'youtube') fields.description = caption;
	else fields.caption = caption;
}

function addAltText(platform: string, fields: IDataObject, altText: unknown): void {
	if (!altText || !Array.isArray(fields.media)) return;
	fields.media = (fields.media as IDataObject[]).map((m) => ({ ...m, altText }));
}

const dateOnly = (value: unknown): string | undefined =>
	typeof value === 'string' && value ? value.slice(0, 10) : undefined;

export class Minopa implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Minopa',
		name: 'minopa',
		icon: { light: 'file:../../icons/minopa.svg', dark: 'file:../../icons/minopa.dark.svg' },
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description:
			'Draft, schedule and publish social media posts, upload media and read analytics with Minopa',
		defaults: { name: 'Minopa' },
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'minopaApi', required: true }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Analytics', value: 'analytics' },
					{ name: 'Media', value: 'media' },
					{ name: 'Post', value: 'post' },
					{ name: 'Social Account', value: 'socialAccount' },
					{ name: 'Workspace', value: 'workspace' },
				],
				default: 'post',
			},
			...postOperations,
			...postFields,
			...mediaOperations,
			...mediaFields,
			...socialAccountOperations,
			...workspaceOperations,
			...analyticsOperations,
			...analyticsFields,
		],
	};

	methods = {
		loadOptions: {
			async getSocialAccounts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const accounts = (await minopaApiRequest.call(this, 'GET', '/v1/social-accounts')) as IDataObject[];

				return accounts.map((a) => ({
					name: `${PLATFORM_LABELS[a.platform as string] ?? a.platform} · ${a.username ?? a.displayName}`,
					value: a.id as string,
					description: a.status === 'connected' ? undefined : `Status: ${a.status as string}`,
				}));
			},

			async getPostTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const accountId = this.getCurrentNodeParameter('accountId') as string;

				if (!accountId) return [];

				const platform = await getAccountPlatform.call(this, accountId);

				return (POST_TYPES[platform] ?? []).map((type) => ({
					name: type.charAt(0) + type.slice(1).toLowerCase(),
					value: type,
				}));
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;
				let result: IDataObject | IDataObject[];

				if (resource === 'post') {
					result = await executePost.call(this, i, operation);
				} else if (resource === 'media') {
					result = await executeMedia.call(this, i, operation);
				} else if (resource === 'socialAccount') {
					result = await minopaApiRequest.call(this, 'GET', '/v1/social-accounts');
				} else if (resource === 'workspace') {
					result = await minopaApiRequest.call(
						this,
						'GET',
						operation === 'getUsage' ? '/v1/workspace/usage' : '/v1/workspace',
					);
				} else {
					result = await executeAnalytics.call(this, i, operation);
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(result),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}

		return [returnData];
	}
}

async function executePost(
	this: IExecuteFunctions,
	i: number,
	operation: string,
): Promise<IDataObject | IDataObject[]> {
	if (operation === 'create') {
		const accountId = this.getNodeParameter('accountId', i) as string;
		const postType = this.getNodeParameter('postType', i) as string;
		const caption = this.getNodeParameter('caption', i, '') as string;
		const mediaIds = splitList(this.getNodeParameter('mediaIds', i, ''));
		const when = this.getNodeParameter('when', i) as string;
		const options = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
		const platform = await getAccountPlatform.call(this, accountId);

		const fields: IDataObject = { postType };
		setCaption(platform, fields, caption);
		setMedia(platform, fields, mediaIds);
		addAltText(platform, fields, options.altText);
		Object.assign(fields, buildPlatformFields(this, i, platform, options));

		if (when === 'schedule') {
			fields.scheduledTime = new Date(this.getNodeParameter('scheduledTime', i) as string).toISOString();
		} else if (when === 'now') {
			fields.scheduledTime = soonIso();
		}

		const body: IDataObject = { workspaceIntegrationIds: [accountId], [platform]: fields };
		if (options.note) body.note = options.note;

		const created = (await minopaApiRequest.call(this, 'POST', '/v1/posts', body)) as IDataObject[];
		const post = Array.isArray(created) ? created[0] : (created as IDataObject);

		if (when === 'now' && post?.id) {
			return minopaApiRequest.call(this, 'POST', `/v1/posts/${post.id as string}/publish`);
		}

		return post;
	}

	if (operation === 'getAll') {
		const returnAll = this.getNodeParameter('returnAll', i) as boolean;
		const limit = returnAll ? 0 : (this.getNodeParameter('limit', i) as number);
		const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
		const qs: IDataObject = {};

		if (filters.connectionId) qs.connectionId = filters.connectionId;
		if (filters.search) qs.search = filters.search;
		if (Array.isArray(filters.status) && filters.status.length) qs.status = filters.status;

		return minopaApiRequestAllItems.call(this, '/v1/posts', qs, returnAll, limit);
	}

	if (operation === 'getStats') {
		return minopaApiRequest.call(this, 'GET', '/v1/posts/stats');
	}

	const postId = this.getNodeParameter('postId', i) as string;

	if (operation === 'get') return minopaApiRequest.call(this, 'GET', `/v1/posts/${postId}`);
	if (operation === 'getMetrics') return minopaApiRequest.call(this, 'GET', `/v1/posts/${postId}/metrics`);

	if (operation === 'delete') {
		await minopaApiRequest.call(this, 'DELETE', `/v1/posts/${postId}`);

		return { deleted: true, id: postId };
	}

	const post = (await minopaApiRequest.call(this, 'GET', `/v1/posts/${postId}`)) as IDataObject;
	const accountId = (post.integration as IDataObject | undefined)?.id as string | undefined;

	if (!accountId) {
		throw new NodeOperationError(
			this.getNode(),
			'The social account of this post is no longer connected; reconnect it in Minopa first',
			{ itemIndex: i },
		);
	}

	const platform = await getAccountPlatform.call(this, accountId);

	if (operation === 'publish') {
		if (post.status === 'published' || post.status === 'publishing') return post;

		// A draft has no scheduled job yet: schedule it just ahead, then publish now.
		if (post.status === 'draft') {
			await minopaApiRequest.call(this, 'PUT', `/v1/posts/${postId}`, {
				[platform]: { scheduledTime: soonIso() },
			});
		}

		return minopaApiRequest.call(this, 'POST', `/v1/posts/${postId}/publish`);
	}

	// update
	const update = this.getNodeParameter('updateFields', i, {}) as IDataObject;
	const fields = buildPlatformFields(this, i, platform, update);

	setCaption(platform, fields, (update.caption as string) ?? '');
	setMedia(platform, fields, splitList(update.mediaIds));
	addAltText(platform, fields, update.altText);
	if (update.scheduledTime) {
		fields.scheduledTime = new Date(update.scheduledTime as string).toISOString();
	}

	return minopaApiRequest.call(this, 'PUT', `/v1/posts/${postId}`, { [platform]: fields });
}

async function executeMedia(
	this: IExecuteFunctions,
	i: number,
	operation: string,
): Promise<IDataObject | IDataObject[]> {
	if (operation === 'get') {
		const mediaId = this.getNodeParameter('mediaId', i) as string;

		return minopaApiRequest.call(this, 'GET', `/v1/media/${mediaId}`);
	}

	if (operation === 'getAll') {
		const returnAll = this.getNodeParameter('returnAll', i) as boolean;
		const limit = returnAll ? 0 : (this.getNodeParameter('limit', i) as number);
		const filters = this.getNodeParameter('filters', i, {}) as IDataObject;

		return minopaApiRequestAllItems.call(this, '/v1/media', filters, returnAll, limit);
	}

	// upload: start a session, send the chunks, then complete it.
	const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
	const options = this.getNodeParameter('uploadOptions', i, {}) as IDataObject;
	const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
	const buffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
	const fileName = (options.fileName as string) || binaryData.fileName || 'upload';
	const mimeType = binaryData.mimeType || 'application/octet-stream';

	const session = (await minopaApiRequest.call(this, 'POST', '/v1/media/uploads', {
		fileName,
		mimeType,
		fileSize: buffer.length,
		...(options.folderId ? { folderId: options.folderId } : {}),
	})) as IDataObject;

	const uploadId = session.uploadId as string;
	const chunkSize = session.chunkSize as number;
	const totalChunks = session.totalChunks as number;

	for (let index = 0; index < totalChunks; index++) {
		const chunk = buffer.subarray(index * chunkSize, (index + 1) * chunkSize);
		const form = new FormData();

		form.append('chunkIndex', String(index));
		form.append('chunk', new Blob([chunk], { type: mimeType }), fileName);
		await minopaApiRequest.call(this, 'POST', `/v1/media/uploads/${uploadId}/chunks`, form);
	}

	let media = (await minopaApiRequest.call(
		this,
		'POST',
		`/v1/media/uploads/${uploadId}/complete`,
	)) as IDataObject;

	if (options.waitForProcessing !== false) {
		for (let attempt = 0; attempt < 40; attempt++) {
			if (media.processingStatus === 'PROCESSED' || media.processingStatus === 'FAILED') break;
			await sleep(3000);
			media = (await minopaApiRequest.call(this, 'GET', `/v1/media/${media.id as string}`)) as IDataObject;
		}
	}

	return media;
}

async function executeAnalytics(
	this: IExecuteFunctions,
	i: number,
	operation: string,
): Promise<IDataObject | IDataObject[]> {
	const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
	const qs: IDataObject = {};

	if (dateOnly(filters.from)) qs.from = dateOnly(filters.from);
	if (dateOnly(filters.to)) qs.to = dateOnly(filters.to);
	if (filters.format) qs.format = filters.format;
	if (Array.isArray(filters.accountIds) && filters.accountIds.length) {
		qs.accountIds = (filters.accountIds as string[]).join(',');
	}

	if (operation === 'getBestTimes') return minopaApiRequest.call(this, 'GET', '/v1/analytics/best-times', undefined, qs);
	if (operation === 'getOverview') return minopaApiRequest.call(this, 'GET', '/v1/analytics/overview', undefined, qs);

	if (filters.sort) qs.sort = filters.sort;
	qs.limit = this.getNodeParameter('limit', i) as number;

	return minopaApiRequest.call(this, 'GET', '/v1/analytics/top-posts', undefined, qs);
}
