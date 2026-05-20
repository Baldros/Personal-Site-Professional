# Official API Integration Plan

This plan combines the email attachment `apis-sociais-gratuitas.md` with current official documentation checked on 2026-05-09.

## LinkedIn

Recommended first integration.

What to build first:

- OAuth sign-in.
- Secure token storage on the server.
- Share on LinkedIn for personal profile posts.
- A small editorial workflow where Atlas drafts a post and Andre approves it before publishing.

Required scope:

- `w_member_social` for posting on behalf of the authenticated member.

Important boundaries:

- Consumer access is good for identity and personal sharing.
- Feed reading, profile search, page management, and analytics are not free consumer assumptions.
- Company pages and richer community management require Marketing API access.

Official reference: https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/share-on-linkedin

## TikTok

Useful as a media proof layer after LinkedIn.

What to build first:

- OAuth through Login Kit.
- Display API for profile and recent/self-selected videos.
- Content Posting API only after app review.

Useful scopes:

- `user.info.basic`
- `video.list`
- `video.publish`

Important boundaries:

- Display API covers profile information and uploaded video metadata for authorized users.
- No broad public feed scraping should be assumed.
- Posting and higher capabilities depend on product approval.

Official references:

- https://developers.tiktok.com/doc/display-api-overview
- https://developers.tiktok.com/doc/content-posting-api-get-started

## X

Optional, behind explicit cost controls.

What to build first:

- Read-only usage monitor.
- Monthly budget guard from `X_MONTHLY_BUDGET_USD`.
- Owned-read dashboard only after budget logic is present.
- Posting only after explicit user approval.

Important boundaries:

- Current official API model is pay-per-use.
- Reads are charged per resource, with reduced owned-read pricing for the authenticated developer's own data.
- Search and broader reads should not run without spend limits.

Official references:

- https://docs.x.com/x-api/getting-started/pricing
- https://docs.x.com/x-api/getting-started/about-x-api

## Backend Shape

Suggested route layout:

```text
/api/oauth/linkedin/start
/api/oauth/linkedin/callback
/api/oauth/tiktok/start
/api/oauth/tiktok/callback
/api/social/status
/api/social/linkedin/share
/api/social/tiktok/videos
/api/social/x/usage
/api/agent/stream
```

Each provider should implement a common interface:

```ts
type SocialProvider = {
  name: string;
  scopes: string[];
  isConfigured(): boolean;
  getCapabilities(): Capability[];
};
```

Do not put access tokens in `PUBLIC_*` variables. Anything prefixed with `PUBLIC_` can be bundled into browser code.
