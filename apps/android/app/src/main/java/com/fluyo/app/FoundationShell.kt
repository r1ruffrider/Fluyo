package com.fluyo.app

import androidx.compose.foundation.background
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.*
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.intl.Locale
import androidx.compose.ui.text.intl.LocaleList
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel

private val FluyoLightColors = lightColorScheme(primary = Color(0xFF173C85), onPrimary = Color.White, background = Color(0xFFFFF8ED), onBackground = Color(0xFF14213D), error = Color(0xFF9F1D2D), onError = Color.White)
private val FluyoDarkColors = darkColorScheme(primary = Color(0xFFB8C8FF), onPrimary = Color(0xFF002B72), background = Color(0xFF101726), onBackground = Color(0xFFF7F1E8), error = Color(0xFFFFB3B9), onError = Color(0xFF650017))

@Composable
fun FluyoFoundationApp(model: FoundationShellModel = viewModel()) {
    val dark = androidx.compose.foundation.isSystemInDarkTheme()
    MaterialTheme(colorScheme = if (dark) FluyoDarkColors else FluyoLightColors) {
        val state by model.state.collectAsStateWithLifecycle()
        LaunchedEffect(Unit) { model.start() }
        Surface(modifier = Modifier.fillMaxSize()) {
            FoundationShell(state, AppConfiguration.fromBuild(), model::retry)
        }
    }
}

@Composable
fun FoundationShell(state: FoundationShellState, configuration: AppConfiguration, onRetry: () -> Unit) {
    val actionFocus = remember { FocusRequester() }
    val contentScroll = rememberScrollState()
    var actionIsFocused by remember { mutableStateOf(false) }
    var scopeExpanded by rememberSaveable { mutableStateOf(false) }
    LaunchedEffect(state) {
        if (state == FoundationShellState.Failure) {
            var settledFrames = 0
            var previousMax = -1
            repeat(120) {
                withFrameNanos { }
                val target = contentScroll.maxValue
                if (target > 0 && contentScroll.value != target) {
                    contentScroll.scrollTo(target)
                    withFrameNanos { }
                }
                actionFocus.requestFocus()
                withFrameNanos { }
                val currentMax = contentScroll.maxValue
                if (actionIsFocused && contentScroll.value == currentMax && currentMax == previousMax) {
                    settledFrames += 1
                    if (settledFrames >= 30) return@LaunchedEffect
                } else {
                    settledFrames = 0
                }
                previousMax = currentMax
            }
        }
    }
    Box(
        modifier = Modifier.testTag("foundation-root").semantics { testTagsAsResourceId = true }.fillMaxSize().background(MaterialTheme.colorScheme.background).statusBarsPadding().navigationBarsPadding().padding(20.dp),
        contentAlignment = Alignment.TopCenter,
    ) {
        Column(
            modifier = Modifier.widthIn(max = 640.dp).fillMaxWidth().verticalScroll(contentScroll).testTag("foundation-scroll"),
            verticalArrangement = Arrangement.spacedBy(18.dp),
        ) {
            Text(stringResource(R.string.brand_name), style = MaterialTheme.typography.headlineLarge, modifier = Modifier.testTag("brand-heading").semantics { heading(); traversalIndex = 0f })
            when (state) {
                FoundationShellState.Loading -> FoundationStateCopy(stringResource(R.string.loading_title), stringResource(R.string.loading_body), "loading-state")
                FoundationShellState.SignedOut -> FoundationStateCopy(stringResource(R.string.signed_out_title), stringResource(R.string.signed_out_body), "signed-out-state")
                FoundationShellState.Failure -> FoundationStateCopy(stringResource(R.string.error_title), stringResource(R.string.error_body), "error-state")
            }
            if (configuration.isInternal && configuration.environment != "production") {
                Text(
                    stringResource(R.string.internal_marker, configuration.environment, configuration.semanticVersion, configuration.versionCode, configuration.sourceCommitShort),
                    style = MaterialTheme.typography.labelMedium,
                    modifier = Modifier.testTag("internal-build-marker"),
                )
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(stringResource(R.string.spanish_sample_label))
                Text(buildAnnotatedString { withStyle(SpanStyle(localeList = LocaleList(Locale("es")))) { append(stringResource(R.string.spanish_sample)) } }, modifier = Modifier.testTag("spanish-learning-sample"))
            }
            if (scopeExpanded && state == FoundationShellState.SignedOut) {
                Text(
                    stringResource(R.string.scope_detail),
                    modifier = Modifier.fillMaxWidth().heightIn(min = 24.dp).testTag("scope-detail"),
                )
            }
            when (state) {
                FoundationShellState.SignedOut -> FoundationActionButton(
                    onClick = { scopeExpanded = !scopeExpanded },
                    onFocusChanged = { actionIsFocused = it },
                    modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp).focusRequester(actionFocus).testTag("review-build-button").semantics { traversalIndex = 2f },
                ) { Text(stringResource(R.string.review_scope_action)) }
                FoundationShellState.Failure -> FoundationActionButton(
                    onClick = onRetry,
                    onFocusChanged = { actionIsFocused = it },
                    modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp).focusRequester(actionFocus).testTag("retry-button").semantics { traversalIndex = 2f },
                ) { Text(stringResource(R.string.retry_action)) }
                FoundationShellState.Loading -> Unit
            }
        }
    }
}

@Composable
private fun FoundationActionButton(
    onClick: () -> Unit,
    onFocusChanged: (Boolean) -> Unit,
    modifier: Modifier,
    content: @Composable () -> Unit,
) {
    var isFocused by remember { mutableStateOf(false) }
    Button(
        onClick = onClick,
        modifier = modifier.onFocusChanged { focusState ->
            isFocused = focusState.isFocused
            onFocusChanged(isFocused)
        },
        border = if (isFocused) BorderStroke(3.dp, MaterialTheme.colorScheme.onPrimary) else null,
        content = { content() },
    )
}

@Composable
private fun FoundationStateCopy(title: String, body: String, tag: String) {
    Column(
        modifier = Modifier.testTag(tag).semantics { traversalIndex = 1f; liveRegion = LiveRegionMode.Polite },
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text(title, style = MaterialTheme.typography.headlineMedium, modifier = Modifier.semantics { heading() })
        Text(body, style = MaterialTheme.typography.bodyLarge)
    }
}
