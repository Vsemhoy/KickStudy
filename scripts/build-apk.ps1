param(
    [string]$SdkPath = $env:ANDROID_HOME,
    [string]$JavaPath = $env:JAVA_HOME,
    [ValidatePattern('^(armeabi-v7a|arm64-v8a|x86|x86_64)(,(armeabi-v7a|arm64-v8a|x86|x86_64))*$')]
    [string]$Architectures = 'armeabi-v7a,arm64-v8a'
)

$ErrorActionPreference = 'Stop'
$projectPath = Split-Path -Parent $PSScriptRoot

if (-not $SdkPath) {
    foreach ($candidate in @(
        (Join-Path $projectPath '.cache/android-sdk'),
        "$env:LOCALAPPDATA\Android\Sdk",
        "${env:ProgramFiles(x86)}\Android\android-sdk"
    )) {
        if (Test-Path -LiteralPath (Join-Path $candidate 'platforms')) { $SdkPath = $candidate; break }
    }
}
if (-not $JavaPath) {
    $javaCandidates = @()
    $localJavaPath = Join-Path $projectPath '.cache/java'
    if (Test-Path -LiteralPath $localJavaPath) {
        $javaCandidates += Get-ChildItem -LiteralPath $localJavaPath -Directory |
            Sort-Object Name -Descending | Select-Object -ExpandProperty FullName
    }
    $javaCandidates += "$env:ProgramFiles\Android\Android Studio\jbr"
    $openJdkPath = "$env:ProgramFiles\Android\openjdk"
    if (Test-Path -LiteralPath $openJdkPath) {
        $javaCandidates += Get-ChildItem -LiteralPath $openJdkPath -Directory |
            Sort-Object Name -Descending | Select-Object -ExpandProperty FullName
    }
    foreach ($candidate in $javaCandidates) {
        if (Test-Path -LiteralPath (Join-Path $candidate 'bin/java.exe')) { $JavaPath = $candidate; break }
    }
}
if (-not $SdkPath -or -not (Test-Path -LiteralPath (Join-Path $SdkPath 'platforms'))) {
    throw 'Android SDK not found. Set ANDROID_HOME or pass -SdkPath.'
}
if (-not $JavaPath -or -not (Test-Path -LiteralPath (Join-Path $JavaPath 'bin/java.exe'))) {
    throw 'JDK not found. Set JAVA_HOME or pass -JavaPath. React Native requires a JDK 17 toolchain.'
}
if (-not (Test-Path -LiteralPath (Join-Path $projectPath 'node_modules/expo'))) {
    throw 'Dependencies are missing. Run npm ci first.'
}

$variables = @('JAVA_HOME', 'ANDROID_HOME', 'ANDROID_USER_HOME', 'GRADLE_USER_HOME', 'EXPO_OFFLINE', 'CI', 'NODE_ENV')
$previous = @{}
foreach ($name in $variables) { $previous[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }

Push-Location $projectPath
try {
    $env:JAVA_HOME = $JavaPath
    $env:ANDROID_HOME = $SdkPath
    $env:ANDROID_USER_HOME = Join-Path $projectPath '.cache/android-user'
    $env:GRADLE_USER_HOME = Join-Path $projectPath '.gradle'
    $env:EXPO_OFFLINE = '1'
    $env:CI = '1'

    & npm.cmd run check
    if ($LASTEXITCODE -ne 0) { throw 'Project checks failed.' }
    $env:NODE_ENV = 'production'
    & npx.cmd expo prebuild --platform android --no-install
    if ($LASTEXITCODE -ne 0) { throw 'Android prebuild failed.' }

    $propertiesPath = Join-Path $projectPath 'android/local.properties'
    [IO.File]::WriteAllText($propertiesPath, "sdk.dir=$($SdkPath.Replace('\', '/'))`n", [Text.UTF8Encoding]::new($false))
    & ./android/gradlew.bat -p android :app:assembleRelease --console=plain --no-daemon --max-workers=4 "-PreactNativeArchitectures=$Architectures"
    if ($LASTEXITCODE -ne 0) { throw 'Android APK build failed. See Gradle output above.' }

    $source = Join-Path $projectPath 'android/app/build/outputs/apk/release/app-release.apk'
    if (-not (Test-Path -LiteralPath $source)) { throw 'Gradle did not produce the expected release APK.' }
    $version = (Get-Content -LiteralPath package.json -Raw | ConvertFrom-Json).version
    $outputDirectory = Join-Path $projectPath 'build/apk'
    New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
    $destination = Join-Path $outputDirectory "kickstudy-$version-preview.apk"
    Copy-Item -LiteralPath $source -Destination $destination -Force
    Write-Host "Offline test APK: $destination"
    Write-Host 'The JavaScript bundle is embedded. Expo Go and Metro are not needed.'
    Write-Host 'This preview uses the generated test signing key, not a store release key.'
}
finally {
    Pop-Location
    foreach ($name in $variables) { [Environment]::SetEnvironmentVariable($name, $previous[$name], 'Process') }
}
