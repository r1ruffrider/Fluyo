# Apple and Google Store Account and Mac Setup

Status: owner-action guide; no account enrollment, payment, signing, or store submission is authorized by this
document

Last verified against official platform documentation: 2026-10-30

## Short answer

You do not need a paid store account to open Fluyo in Xcode, run it in an iPhone simulator, or install a
development build on your own iPhone from Xcode. You do need the Apple Developer Program to distribute through
TestFlight or the App Store. Apple lists the membership at USD 99 per year, in local currency where available.

You need a Google Play developer account to publish through Google Play. Google lists the full-distribution
registration fee at USD 25 one time.

Account enrollment, identity verification, agreements, payment, signing, app-record creation, and store
submission are external or spending actions. Marlon completes or explicitly authorizes each such boundary; the
engineering team prepares the evidence and instructions but does not perform those actions silently.

## Decide the legal account owner before enrolling

Use an organization account when Fluyo is owned by an incorporated legal entity and the organization name should
appear as the seller. Use an individual account only when the app is personally owned and the owner's legal name
may appear publicly as the seller.

For an Apple organization enrollment, prepare:

- the exact registered legal-entity name and address;
- a D-U-N-S number for that entity;
- an Apple Account with two-factor authentication;
- proof that the enrolling person can bind the entity;
- a work email on the entity's domain; and
- a public, functional company website on that domain.

For a Google Play organization account, prepare the legal entity, a D-U-N-S number, organization website,
organization phone number, an account-owner Google Account, identity documents requested by Google, and the
payment method for the registration fee. Keep the account-owner identity under Marlon's control and invite team
members later with least-privilege roles instead of sharing the owner password.

Official references:

- [Apple program enrollment](https://developer.apple.com/help/account/membership/program-enrollment)
- [Apple D-U-N-S requirements](https://developer.apple.com/help/account/membership/D-U-N-S/)
- [Google developer account types](https://support.google.com/android-developer-console/answer/16641046)
- [Google account setup and full-distribution fee](https://support.google.com/android-developer-console/answer/16604405)

## Review the current iOS foundation on a MacBook

The current repository app is an unsigned, non-production SwiftUI foundation for iOS 17 and later. It is useful
for simulator review, but it is not a store-ready learning app. Its development and staging configuration is
fail-closed and contains only public synthetic endpoints on `main`.

1. Update the MacBook to a macOS version supported by the current stable Xcode.
2. Install the current stable Xcode from the Mac App Store. App Store uploads currently require an app built with
   Xcode 26 or later; use the version shown by Apple's current upload-requirements page at submission time.
3. Launch Xcode once, accept its license, and allow it to install the iOS simulator runtime and command-line
   components.
4. Sign in to Xcode with Marlon's Apple Account only if a physical-device run or Apple-managed signing is needed.
   Simulator review does not require signing.
5. Install Git and authenticate to GitHub without copying a personal token into the repository.
6. In Terminal, clone the repository and open the Xcode project:

   ```bash
   git clone https://github.com/r1ruffrider/Fluyo.git
   cd Fluyo
   git switch main
   git pull --ff-only
   open apps/ios/Fluyo.xcodeproj
   ```

7. In Xcode, select the `Fluyo` scheme, choose an available iPhone simulator, and press **Run**.
8. Review the current loading, signed-out, safe configuration-error, large-text, VoiceOver, keyboard, rotation,
   reduced-motion, and reload behavior. Do not interpret the foundation shell as proof of live authentication,
   lessons, billing, physical-device support, or store readiness.
9. Run the unit and UI tests from **Product > Test**. A command-line run may also be used after replacing the
   destination with an installed simulator name:

   ```bash
   xcrun simctl list devices available
   xcodebuild \
     -project apps/ios/Fluyo.xcodeproj \
     -scheme Fluyo \
     -configuration Debug \
     -destination 'platform=iOS Simulator,name=<installed iPhone simulator>' \
     test
   ```

10. For an own-device development run, connect the iPhone, enable Developer Mode if prompted, select the device,
    select a development Team in **Signing & Capabilities**, and run from Xcode. Apple states that paid program
    enrollment is not required merely to install an app on a personal device from Xcode.

Do not add production endpoints, private keys, service-role keys, certificates, profiles, or account passwords to
Git. The engineering team will provide a protected non-production configuration after the relevant callback,
allowlist, custody, and live-auth gates are approved.

## Apple enrollment and TestFlight/App Store path

1. Confirm whether the seller will be the legal organization or Marlon as an individual.
2. If organization-owned, look up or request the legal entity's D-U-N-S number before beginning enrollment.
3. Create or choose the owner Apple Account, enable two-factor authentication, and keep recovery access under the
   owner rather than an agent.
4. Enroll through Apple Developer as the selected account type, provide the requested legal verification, accept
   the agreement, and pay the membership only after an explicit spending approval.
5. After Apple approves the membership, invite engineers through role-based access. Do not share the Account
   Holder password.
6. Approve the final production bundle identifier before reserving it. `com.fluyo.app` is only the current
   recommendation; repository identifiers are not proof of reservation.
7. Create the App Store Connect app record before uploading the first build. Record the name, primary language,
   bundle ID, SKU, and access scope.
8. Configure signing and capabilities in Xcode, archive the release candidate, validate it, and upload it with
   Xcode or Transporter. Signing and upload remain separate approval-gated actions.
9. Complete the store record: description, keywords, category, age rating, screenshots, support URL, privacy
   policy URL, app-privacy answers, export-compliance answers, reviewer notes, demo access, account-deletion
   behavior, and subscription metadata if subscriptions are in the reviewed build.
10. Run internal TestFlight testing, repair defects, then use external TestFlight only after its required beta
    review and disclosure are ready.
11. Submit the exact approved build to App Review. Choose manual or phased release so approval does not silently
    publish an unreviewed production rollout.

Official workflow references:

- [App Store Connect workflow](https://developer.apple.com/help/app-store-connect/get-started/app-store-connect-workflow)
- [Create an app record](https://developer.apple.com/help/app-store-connect/create-an-app-record/add-a-new-app/)
- [Upload builds](https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds)
- [Submit an app](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app/)

## Google Play enrollment and release path

1. Confirm whether the publisher will be the organization or Marlon as an individual. An organization account is
   the recommended business-owned path and requires a D-U-N-S number.
2. Create or choose the account-owner Google Account. Enable strong multi-factor authentication and keep its
   recovery methods under the owner.
3. Enroll in the full-distribution developer account, accept the agreements, pay the USD 25 one-time registration
   fee only after explicit spending approval, and complete Google's identity and contact verification.
4. Invite engineers with least-privilege Play Console roles; do not share the owner password.
5. Approve the final production package name before creating the Play app. A package name is unique and permanent.
   `com.fluyo.app` is only the current recommendation.
6. Create the app record, select app versus game, free versus paid, default language, support email, and required
   declarations.
7. Generate a protected upload key outside Git, create a signed Android App Bundle, enroll in Play App Signing,
   and store recovery material under the approved credential-custody process. The present Fluyo APKs use debug
   signing and are not Play release artifacts.
8. Complete the store and policy record: app name and descriptions, category and tags, icon, feature graphic,
   screenshots, privacy policy, Data safety, content rating, ads declaration, target audience, app-access/reviewer
   instructions, account-deletion URL, permissions, and subscription metadata if applicable.
9. Upload the signed bundle to internal testing and run the exact-device and accessibility test matrix.
10. Move to closed testing after the internal gate. A new personal account created after 13 November 2023 must
    currently maintain at least 12 opted-in testers for at least 14 continuous days before applying for production
    access. Google states that organization-account requirements can differ; follow the actual Play Console gate.
11. Repair pre-launch report and policy findings, apply for production access if required, and use a staged rollout
    only after the production release gate is explicitly approved.

Official workflow references:

- [Create and set up an app](https://support.google.com/googleplay/android-developer/answer/9859152)
- [New personal-account testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465)
- [Prepare an app for review](https://support.google.com/googleplay/android-developer/answer/9859455)
- [App signing and Play App Signing](https://developer.android.com/studio/publish/app-signing)
- [Upload an app bundle](https://developer.android.com/studio/publish/upload-bundle)

## Fluyo readiness at this checkpoint

- Apple/Google enrollment: owner action not yet recorded as complete.
- iOS local simulator review: available on a MacBook using the current Xcode project.
- iOS physical-device signing, TestFlight, and App Store: not yet established.
- Android emulator/debug APK review: available; existing artifacts are debug-signed and not Play-ready.
- Live native authentication: not yet accepted for runtime use; material selections remain evidence-pending.
- Store callback domains, associated domains, AASA/Asset Links, Supabase allowlists, credential custody, account
  deletion, native billing, store assets, privacy declarations, signing, and production release: still gated.

The safe order is: choose the legal account type, prepare identity/D-U-N-S information, review the current iOS
foundation on the MacBook, enroll in both organization accounts if applicable, then continue implementation and
testing before any TestFlight or Play upload.
