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
}

baselineProfile {
    useConnectedDevices = true
}

dependencies {
    implementation("androidx.benchmark:benchmark-macro-junit4:1.5.0")
    implementation("androidx.test.ext:junit:1.3.0")
    implementation("androidx.test.uiautomator:uiautomator:2.4.0")
}
