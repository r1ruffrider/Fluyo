# Native auth SDK provenance candidate evidence

This document is candidate-only decision evidence. It records repository facts and a review procedure; it does not select, approve, install, resolve, or exercise an iOS or Android authentication SDK.

## Evidence classification

| Class                    | Current evidence                                                                                                                                                                                                                                                                                                                                                              | Boundary                                                                                     |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Observed repository fact | The bound base contains iOS and Android native foundation policies with Supabase public configuration fields, SDK-neutral native dependency manifests, and a provider-neutral auth-state contract. The bound iOS project manifest and Android app Gradle manifest contain no native authentication SDK package or coordinate selection. No native auth runtime result exists. | This observation is limited to the exact bound policy, manifest, and contract bytes.         |
| Proposed material choice | Before selection, record the exact package or coordinate, version, upstream source/repository, artifact SHA-256, license, advisories, supported OS floor, transitive graph, and credential/diagnostic logging behavior.                                                                                                                                                       | The review procedure is a proposal, not a package decision.                                  |
| External blocker         | No approved package/version, artifact digest, upstream advisory snapshot, license disposition, or platform security custodian is recorded.                                                                                                                                                                                                                                    | Repository inspection cannot substitute for external provenance or Marlon's material choice. |
| Unattempted runtime      | Native SDK resolution, installation, initialization, sign-in, logging capture, and device execution remain unattempted.                                                                                                                                                                                                                                                       | Runtime is 0 passed, 0 failed, and 24 unattempted across the native matrix.                  |

## iOS candidate requirements

`AUTH-SDK-IOS` remains blocked. A future reviewed packet must name one exact package and version, bind the downloaded artifact and complete dependency graph by digest, record license and advisory review, confirm the supported iOS floor, and demonstrate that credentials and diagnostic data are not retained or emitted. The existing iOS foundation policy is useful repository context only.

## Android candidate requirements

`AUTH-SDK-ANDROID` remains blocked. A future reviewed packet must name one exact coordinate, version, repository, AAR and transitive graph; bind those bytes by digest; record license and advisory review; confirm the supported Android floor; prove the reviewed release contains the relevant credential-logging fix; and prove the Fluyo logging boundary retains neither SDK messages nor throwable contents. The existing Android foundation and resolution proof are context only.

## Candidate review sequence

1. A named security custodian proposes one exact upstream release for each platform.
2. Engineering captures immutable upstream coordinates and raw artifact digests without adding dependencies.
3. Natalia reviews security, provenance, logging, platform-floor, and transitive-dependency evidence.
4. Elana independently audits the exact reviewed packet head.
5. Marlon may then select a value through the separately accepted approval-governance mechanism.

Until every step is complete, the fallback remains provider-neutral ports with zero native runtime. No wording may claim that an SDK is selected, approved, installed, safe, verified, supported, or exercised.
