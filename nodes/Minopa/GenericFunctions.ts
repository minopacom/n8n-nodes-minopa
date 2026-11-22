import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

type Context = IExecuteFunctions | ILoadOptionsFunctions;

/** Platforms whose post fields take media as `media: [{ id }]` instead of `mediaIds`. */
const MEDIA_OBJECT_PLATFORMS = ['instagram', 'threads', 'pinterest'];

export const PLATFORM_LABELS: Record<string, string> = {
	instagram: 'Instagram',
	tiktok: 'TikTok',
	threads: 'Threads',
	facebookpage: 'Facebook Page',
	x: 'X',
	linkedin: 'LinkedIn',
	youtube: 'YouTube',
	pinterest: 'Pinterest',
};

/** Post types the API accepts, per platform. */
export const POST_TYPES: Record<string, string[]> = {
	instagram: ['POST', 'REEL', 'STORY'],
	tiktok: ['VIDEO', 'PHOTO'],
	threads: ['TEXT', 'IMAGE', 'VIDEO'],
	facebookpage: ['TEXT', 'PHOTO', 'REEL', 'STORY'],
	x: ['TEXT', 'IMAGE', 'VIDEO'],
	linkedin: ['TEXT', 'IMAGE', 'VIDEO', 'ARTICLE'],
	youtube: ['VIDEO', 'SHORT'],
	pinterest: ['IMAGE', 'VIDEO'],
};

async function baseUrl(this: Context): Promise<string> {
	const credentials = await this.getCredentials('minopaApi');
	const url = ((credentials.baseUrl as string) || 'https://api.minopa.com').trim();

	return url.replace(/\/+$/, '');
}

/** Calls the Minopa public API and returns the `data` part of the response. */
export async function minopaApiRequest(
	this: Context,
	method: IHttpRequestMethods,
	endpoint: string,
	body?: IDataObject | FormData,
	qs: IDataObject = {},
): Promise<IDataObject | IDataObject[]> {
	const options: IHttpRequestOptions = {
		method,
		url: `${await baseUrl.call(this)}${endpoint}`,
		qs,
		json: true,
	};

	if (body !== undefined) options.body = body;

	try {
		const response = await this.helpers.httpRequestWithAuthentication.call(
			this,
			'minopaApi',
			options,
		);

		return response && typeof response === 'object' && 'data' in response
			? response.data
			: response;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

/** Like minopaApiRequest, for list endpoints: also returns the total count. */
async function minopaApiListPage(
	this: Context,
	endpoint: string,
	qs: IDataObject,
): Promise<{ data: IDataObject[]; total?: number }> {
	const options: IHttpRequestOptions = {
		method: 'GET',
		url: `${await baseUrl.call(this)}${endpoint}`,
		qs,
		json: true,
	};

	try {
		const response = await this.helpers.httpRequestWithAuthentication.call(
			this,
			'minopaApi',
			options,
		);

		return { data: (response.data as IDataObject[]) ?? [], total: response.total as number };
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

/**
 * Reads a paginated list (page/limit). With `returnAll`, follows pages until
 * the total is reached; otherwise returns at most `limit` items.
 */
export async function minopaApiRequestAllItems(
	this: Context,
	endpoint: string,
	qs: IDataObject,
	returnAll: boolean,
	limit: number,
): Promise<IDataObject[]> {
	const pageSize = returnAll ? 100 : Math.min(limit, 100);
	const items: IDataObject[] = [];
	let page = 1;

	for (;;) {
		const { data, total } = await minopaApiListPage.call(this, endpoint, {
			...qs,
			page,
			limit: pageSize,
		});

		items.push(...data);

		const done =
			data.length < pageSize ||
			(total !== undefined && items.length >= total) ||
			(!returnAll && items.length >= limit);

		if (done) break;
		page++;
	}

	return returnAll ? items : items.slice(0, limit);
}

/** Splits a comma-separated parameter into trimmed, non-empty values. */
export function splitList(value: unknown): string[] {
	if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
	if (typeof value !== 'string') return [];

	return value
		.split(',')
		.map((v) => v.trim())
		.filter(Boolean);
}

/** Puts media IDs into the field shape the platform expects. */
export function setMedia(platform: string, fields: IDataObject, mediaIds: string[]): void {
	if (!mediaIds.length) return;
	if (MEDIA_OBJECT_PLATFORMS.includes(platform)) {
		fields.media = mediaIds.map((id) => ({ id }));
	} else {
		fields.mediaIds = mediaIds;
	}
}

/** The platform slug of a connected social account. */
export async function getAccountPlatform(this: Context, accountId: string): Promise<string> {
	const accounts = (await minopaApiRequest.call(this, 'GET', '/v1/social-accounts')) as IDataObject[];
	const account = accounts.find((a) => a.id === accountId);

	if (!account) {
		throw new NodeApiError(this.getNode(), {
			message: `Social account ${accountId} is not connected to this workspace`,
		} as JsonObject);
	}

	return account.platform as string;
}

/** A time a minute from now: publishing a draft schedules it just ahead, then promotes it. */
export function soonIso(): string {
	return new Date(Date.now() + 60_000).toISOString();
}
