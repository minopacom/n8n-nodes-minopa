import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class MinopaApi implements ICredentialType {
	name = 'minopaApi';

	displayName = 'Minopa API';

	icon: Icon = { light: 'file:../icons/minopa.svg', dark: 'file:../icons/minopa.dark.svg' };

	documentationUrl = 'https://developers.minopa.com';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'A workspace API key. Create one in Minopa under Settings → API Keys. It starts with mnp_live_.',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.minopa.com',
			description: 'Leave as is unless Minopa support gave you a different API address',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/v1/workspace',
			method: 'GET',
		},
	};
}
