# n8n-nodes-minopa

This is an n8n community node for [Minopa](https://minopa.com). It lets you draft, schedule and publish social media posts to Instagram, TikTok, Threads, Facebook Pages, X, LinkedIn, Pinterest and YouTube from your n8n workflows, upload images and videos to your Minopa media library, and read post analytics.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

[Installation](#installation) · [Credentials](#credentials) · [Operations](#operations) · [Usage](#usage) · [Resources](#resources)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation and install `n8n-nodes-minopa`.

## Credentials

You need a Minopa account (there is a [free plan](https://minopa.com/en/pricing)) with at least one social account connected, and an API key:

1. In Minopa, open **Settings → API Keys** and create a key. Give it the scopes your workflow needs (for example posts, media and analytics).
2. In n8n, create a **Minopa API** credential and paste the key. Leave **Base URL** as `https://api.minopa.com`.

The credential test calls `GET /v1/workspace` to check the key.

## Operations

**Post**
- **Create**: save a draft, schedule a post, or publish it now. Pick the social account and post type, add a caption and media IDs. Additional fields cover titles, tags, links, alt text, TikTok and YouTube privacy, YouTube "made for kids", Pinterest boards, and any other platform field as JSON.
- **Get**, **Get Many** (filter by account, status or text), **Update**, **Delete**
- **Publish**: publish a draft or scheduled post right away
- **Get Metrics**: views, likes and other metrics of a published post
- **Get Stats**: post counts by status

**Media**
- **Upload**: upload an image or video from an n8n binary field to the media library. By default it waits until Minopa has processed the file, so you can use its ID in a post in the next node.
- **Get**, **Get Many**

**Social Account**
- **Get Many**: the accounts connected to the workspace, with their IDs and status

**Workspace**
- **Get**, **Get Usage** (plan limits and usage)

**Analytics**
- **Get Overview**, **Get Top Posts**, **Get Best Times**, filtered by period, accounts and format

The node can also be used as a tool by n8n AI agents.

## Usage

A typical workflow: **HTTP Request** (download an image as a file) → **Minopa: Media → Upload** → **Minopa: Post → Create** with *Media IDs* set to `{{ $json.id }}` and *When* set to *Schedule*.

### Example workflow

[examples/schedule-image-post.json](examples/schedule-image-post.json) downloads an image, uploads it to Minopa and schedules an Instagram post for 9:00 tomorrow. To use it:

1. In n8n, open **Workflows → Import from File** (or paste the JSON onto the canvas).
2. Select your **Minopa API** credential on both Minopa nodes.
3. In **Schedule Instagram post**, pick your Instagram account under *Social Account*.
4. Run the workflow. The post appears as scheduled in your Minopa calendar.

To post somewhere else, pick that account and a matching post type (for example *Text* for an X or LinkedIn text post, which needs no media).

Notes:
- Each social network has its own required fields. For example TikTok needs a privacy level, YouTube needs a title, a privacy status and "made for kids", and Pinterest needs a board ID. If one is missing, the node returns Minopa's validation message naming the field.
- Media must be processed before it can be posted; keep *Wait Until Processed* on when uploading.
- If the workspace requires approval, created posts wait for an approver in Minopa.

## Compatibility

Built and tested with n8n 2.x. The node has no runtime dependencies.

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [Minopa API reference](https://developers.minopa.com)
- [Minopa MCP server and AI agent setup](https://minopa.com/en/mcp)
- Support: [info@minopa.com](mailto:info@minopa.com)

## Version history

See [CHANGELOG.md](CHANGELOG.md).
