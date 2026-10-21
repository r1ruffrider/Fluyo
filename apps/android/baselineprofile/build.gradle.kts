import com.android.build.api.dsl.ManagedVirtualDevice.PageAlignment.FORCE_4KB_PAGES

plugins {
    id("com.android.test")
    id("androidx.baselineprofile")
}

android {
    namespace = "com.fluyo.baselineprofile"
    compileSdk = 37
    buildToolsVersion = "36.0.0"
    targetProjectPath = ":app"
    defaultConfig {
        minSdk = 29
        targetSdk = 36
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }
    flavorDimensions += "environment"
    productFlavors {
        create("development") { dimension = "environment" }
    }
    testOptions.managedDevices.localDevices {
        create("profileApi37") {
            device = "Pixel 9 Pro XL"
            apiLevel = 37
            systemImageSource = "google"
            pageAlignment = FORCE_4KB_PAGES
        }
    }
}

baselineProfile {
    managedDevices += "profileApi37"
    useConnectedDevices = false
}

dependencies {
    implementation("androidx.benchmark:benchmark-macro-junit4:1.5.0")
    implementation("androidx.test.ext:junit:1.3.0")
    implementation("androidx.test.uiautomator:uiautomator:2.4.0")
}
