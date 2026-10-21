plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.plugin.compose")
    id("androidx.baselineprofile")
}

android {
    namespace = "com.fluyo.app"
    compileSdk = 37
    buildToolsVersion = "36.0.0"

    defaultConfig {
        val sourceCommitShort = providers.gradleProperty("fluyoSourceCommitShort").orElse("0000000")
        applicationId = "com.fluyo.app"
        minSdk = 29
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        buildConfigField("String", "FLUYO_API_BASE_URL", "\"\"")
        buildConfigField("String", "FLUYO_SUPABASE_URL", "\"\"")
        buildConfigField("String", "FLUYO_SUPABASE_PUBLISHABLE_KEY", "\"\"")
        buildConfigField("String", "FLUYO_ENVIRONMENT", "\"production\"")
        buildConfigField("boolean", "FLUYO_NETWORK_ENABLED", "false")
        buildConfigField("boolean", "FLUYO_INTERNAL_BUILD", "false")
        buildConfigField("String", "FLUYO_SOURCE_COMMIT_SHORT", "\"${sourceCommitShort.get()}\"")
    }

    flavorDimensions += "environment"
    productFlavors {
        create("development") {
            dimension = "environment"
            applicationIdSuffix = ".dev"
            buildConfigField("String", "FLUYO_API_BASE_URL", "\"https://api.dev.fluyo.example.test/api/v1\"")
            buildConfigField("String", "FLUYO_SUPABASE_URL", "\"https://auth.dev.fluyo.example.test\"")
            buildConfigField("String", "FLUYO_SUPABASE_PUBLISHABLE_KEY", "\"synthetic_public_value\"")
            buildConfigField("String", "FLUYO_ENVIRONMENT", "\"development\"")
            buildConfigField("boolean", "FLUYO_NETWORK_ENABLED", "true")
            buildConfigField("boolean", "FLUYO_INTERNAL_BUILD", "true")
        }
        create("staging") {
            dimension = "environment"
            applicationIdSuffix = ".staging"
            buildConfigField("String", "FLUYO_API_BASE_URL", "\"https://api.staging.fluyo.example.test/api/v1\"")
            buildConfigField("String", "FLUYO_SUPABASE_URL", "\"https://auth.staging.fluyo.example.test\"")
            buildConfigField("String", "FLUYO_SUPABASE_PUBLISHABLE_KEY", "\"synthetic_public_value\"")
            buildConfigField("String", "FLUYO_ENVIRONMENT", "\"staging\"")
            buildConfigField("boolean", "FLUYO_NETWORK_ENABLED", "true")
            buildConfigField("boolean", "FLUYO_INTERNAL_BUILD", "true")
        }
        create("production") {
            dimension = "environment"
        }
    }

    buildTypes {
        debug {
            isDebuggable = true
            isMinifyEnabled = false
            isPseudoLocalesEnabled = true
        }
        release {
            isDebuggable = false
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }
    packaging { resources.excludes += setOf("/META-INF/{AL2.0,LGPL2.1}") }
    testOptions {
        animationsDisabled = true
        managedDevices.localDevices {
            create("smallApi29") {
                device = "Pixel 2"
                apiLevel = 29
                systemImageSource = "google"
            }
        }
    }
    lint {
        abortOnError = true
        warningsAsErrors = true
        checkDependencies = true
        // targetSdk 36 is the accepted product baseline; compileSdk 37 is used only
        // for current Compose build compatibility and does not expand runtime claims.
        disable += setOf(
            "AndroidGradlePluginVersion",
            "GradleDependency",
            "NewerVersionAvailable",
            "OldTargetApi",
        )
    }
}

baselineProfile {
    dexLayoutOptimization = false
    automaticGenerationDuringBuild = false
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2026.09.00")
    implementation(composeBom)
    androidTestImplementation(composeBom)
    implementation("androidx.activity:activity-compose:1.13.0")
    implementation("androidx.compose.foundation:foundation")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.11.0")
    implementation("androidx.profileinstaller:profileinstaller:1.4.1")
    debugImplementation("androidx.compose.ui:ui-tooling")
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.10.2")
    androidTestImplementation("androidx.test:core:1.7.0")
    androidTestImplementation("androidx.test.ext:junit:1.3.0")
    androidTestImplementation("androidx.test:runner:1.7.0")
    androidTestImplementation("androidx.test.uiautomator:uiautomator:2.4.0")
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
    baselineProfile(project(":baselineprofile"))
}
