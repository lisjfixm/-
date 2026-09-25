'use strict';

exports.configs = {
    android: {
        hooks: './hooks',
        options: {
            packageName: {
                default: 'com.mrtgd.game',
                verifyRules: []
            },
            apiLevel: {
                default: 'android-30',
                verifyRules: []
            }
        }
    }
};
