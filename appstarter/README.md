# App Starter reuse

ATLAS vendors the exact [`OrgRole` enum](https://github.com/digohq/app-starter/blob/7c528e1407aeea502423b393f793f5b17c6caf4e/packages/shared/src/enums/org-role.enum.ts) from `digohq/app-starter`, pinned to commit `7c528e1407aeea502423b393f793f5b17c6caf4e`. `persona-mapping.ts` maps ATLAS's synthetic Engineering and Support personas to the upstream `ADMIN` and `MEMBER` values. The demo UI uses that role mapping to expose source-version append controls to Engineering only. It is demo behavior, not real identity, membership, or authentication; the API has its own demo-role guard and does not consume App Starter's enum.

This is a focused reuse of one shared enum, not a port or adoption of App Starter's NestJS/Next.js application, authentication, tenancy, or UI components.

**Source snapshot:** `digohq/app-starter` commit `7c528e1407aeea502423b393f793f5b17c6caf4e`. The source file is preserved verbatim in `org-role.enum.ts`.

## License

The upstream project is MIT licensed. Its license text is reproduced in [LICENSE](LICENSE).
