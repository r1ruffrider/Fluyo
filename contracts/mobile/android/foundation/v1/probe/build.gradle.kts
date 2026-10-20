plugins {
    id("com.android.application") version "9.4.0" apply false
    id("org.jetbrains.kotlin.android") version "2.4.10" apply false
    id("org.jetbrains.kotlin.plugin.compose") version "2.4.10" apply false
    id("androidx.baselineprofile") version "1.5.0" apply false
}

val metadataProbe = configurations.create("metadataProbe") {
    isCanBeConsumed = false
    isCanBeResolved = true
    attributes {
        attribute(
            org.gradle.api.attributes.Category.CATEGORY_ATTRIBUTE,
            objects.named(org.gradle.api.attributes.Category.LIBRARY),
        )
        attribute(
            org.gradle.api.attributes.Usage.USAGE_ATTRIBUTE,
            objects.named(org.gradle.api.attributes.Usage.JAVA_RUNTIME),
        )
    }
}

val binaryProbe = configurations.create("binaryProbe") {
    isCanBeConsumed = false
    isCanBeResolved = true
    isTransitive = false
}

dependencies {
    add("metadataProbe", platform("androidx.compose:compose-bom:2026.09.00"))
    add("metadataProbe", "androidx.compose.ui:ui:1.12.1")
    add("metadataProbe", "androidx.profileinstaller:profileinstaller:1.4.1")
    add("metadataProbe", "androidx.benchmark:benchmark-macro-junit4:1.5.0")

    add("binaryProbe", "androidx.compose.ui:ui-android:1.12.1@aar")
    add("binaryProbe", "androidx.profileinstaller:profileinstaller:1.4.1@aar")
    add("binaryProbe", "androidx.benchmark:benchmark-macro-junit4:1.5.0@aar")
}

tasks.register("resolveProof") {
    doLast {
        val components = metadataProbe.incoming.resolutionResult.allComponents
            .mapNotNull { it.moduleVersion?.toString() }
            .sorted()
        val requiredComponents = listOf(
            "androidx.compose:compose-bom:2026.09.00",
            "androidx.compose.ui:ui:1.12.1",
            "androidx.profileinstaller:profileinstaller:1.4.1",
            "androidx.benchmark:benchmark-macro-junit4:1.5.0",
        )
        requiredComponents.forEach { expected ->
            check(components.contains(expected)) { "Missing resolved component: $expected" }
        }

        val binaryNames = binaryProbe.files.map { it.name }.sorted()
        val requiredBinaries = listOf(
            "benchmark-macro-junit4-1.5.0.aar",
            "profileinstaller-1.4.1.aar",
            "ui-android-1.12.1.aar",
        )
        check(binaryNames == requiredBinaries) {
            "Resolved binary set mismatch: expected=$requiredBinaries actual=$binaryNames"
        }

        println("FLUYO_RESOLUTION_PROOF_BEGIN")
        requiredComponents.forEach(::println)
        requiredBinaries.forEach(::println)
        println("FLUYO_RESOLUTION_PROOF_END")
    }
}
