# Native auth links and custody candidate evidence

This document records candidate-only evidence for callback hosts, association files, redirect allowlists, and non-production custody. It does not create or change any host, file, dashboard entry, account, credential, signing identity, or external service.

## Observed repository facts

The bound repository contains a web auth callback route and provider-neutral native foundation identifiers. Those tracked files are useful design inputs, but they do not prove control of a native callback host, TLS, Apple application-site association bytes, Android `assetlinks.json` bytes, certificate fingerprints, Supabase redirect entries, or external-account custody.

## Proposed material choices

- Inventory exact development and staging HTTPS callback hosts and routes only after a domain custodian attests control and TLS responsibility.
- Do not generate AASA or assetlinks candidates unless the final app identifiers, signing/certificate bindings, hosts, and routes have been supplied; any later candidate must bind exact bytes by SHA-256 and require positive retrieval plus negative-route checks.
- Do not derive a Supabase redirect allowlist unless the callback, AASA, and assetlinks decisions have been separately approved. Treat any dashboard mutation as a separate external action.
- Document named primary and backup custodians, least-privilege roles, recovery, rotation, offboarding, and incident handoff for the non-production project and delivery services.

These are proposed review steps, not selected values.

## External blockers

Required domain, TLS, Apple binding, Android signing/certificate, Supabase project, delivery, support, recovery, and incident custodians have not supplied approved evidence. Exact external host and dashboard state is not asserted. No credential or private identifier belongs in this packet.

## Unattempted runtime

Universal-link retrieval, Android App Link retrieval, positive/negative routing, provider callback completion, allowlist enforcement, recovery delivery, device association, and external custody drills remain unattempted. Runtime stays 0/0/0/24.

The safe fallback is synthetic in-memory callback fixtures and unchanged external dashboards. No native callback domain or native redirect entry is selected, configured, or authorized by this packet; existing web callback and redirect configuration is out of scope and unchanged. No native AASA or assetlinks file is committed or authorized by this packet; any external association-file state is out of scope and unasserted. Recovery delivery remains blocked. Account custody remains blocked. Link behavior remains unverified.
