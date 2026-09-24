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

exports.onBeforeBuild = async function (options, result) {
    console.log('[build-fixer] onBeforeBuild called, platform:', options && options.platform);
    if (options && options.platform === 'android') {
        options.packages = options.packages || {};
        options.packages.android = Object.assign(
            {},
            ANDROID_OPTIONS,
            options.packages.android || {}
        );
        console.log('[build-fixer] Injected Android options:', JSON.stringify(options.packages.android));
    }
};

exports.load = function () {
    console.log('[build-fixer] hooks loaded');
};

exports.unload = function () {
    console.log('[build-fixer] hooks unloaded');
};
