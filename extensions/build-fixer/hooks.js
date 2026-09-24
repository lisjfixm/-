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

function inject(options) {
    if (!options) return;
    if (options.platform === 'android') {
        options.packages = options.packages || {};
        options.packages.android = Object.assign(
            {},
            ANDROID_OPTIONS,
            options.packages.android || {}
        );
        console.log('[build-fixer] Injected Android options');
    }
}

exports.onBeforeBuild = async function (options, result) {
    console.log('[build-fixer] onBeforeBuild, platform:', options && options.platform);
    inject(options);
};

exports.onAfterInit = async function (options, result) {
    console.log('[build-fixer] onAfterInit, platform:', options && options.platform);
    inject(options);
};

exports.load = function () {
    console.log('[build-fixer] hooks loaded');
};

exports.unload = function () {
    console.log('[build-fixer] hooks unloaded');
};
