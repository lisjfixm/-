'use strict';

const ANDROID_OPTIONS = {
    packageName: 'com.mrtgd.game',
    apiLevel: 'android-30',
    appABIs: ['arm64-v8a'],
    useDebugKeystore: true,
    keystorePath: '',
    keystorePassword: '',
    keystoreAlias: '',
    keystoreAliasPassword: '',
    orientation: {
        portrait: true,
        upsideDown: false,
        landscapeRight: false,
        landscapeLeft: false
    }
};

function injectOptions(options) {
    if (!options) return;
    if (options.platform === 'android') {
        options.packages = options.packages || {};
        options.packages.android = Object.assign(
            {},
            ANDROID_OPTIONS,
            options.packages.android || {}
        );
        console.log('[build-fixer] Injected Android options:', JSON.stringify(options.packages.android));
    }
}

exports.methods = {
    onBuildStart(options) {
        console.log('[build-fixer] onBuildStart called, platform:', options && options.platform);
        injectOptions(options);
    }
};

exports.load = function () {
    console.log('[build-fixer] Extension loaded');
    try {
        if (Editor.Builder && Editor.Builder.on) {
            Editor.Builder.on('build-start', injectOptions);
            console.log('[build-fixer] Registered build-start listener via Editor.Builder.on');
        }
    } catch (e) {
        console.log('[build-fixer] Editor.Builder.on failed:', e.message);
    }
};

exports.unload = function () {
    try {
        if (Editor.Builder && Editor.Builder.removeListener) {
            Editor.Builder.removeListener('build-start', injectOptions);
        }
    } catch (e) {}
};
