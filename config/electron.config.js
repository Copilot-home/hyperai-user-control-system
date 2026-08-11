module.exports = {
    appId: 'com.hyperai.usercontrol',
    productName: 'HyperAI User Control System',
    copyright: '© 2023 HyperAI',
    version: '1.0.0',
    directories: {
        output: 'build',
    },
    files: [
        'dist/**/*',
        'public/**/*',
        'src/**/*',
        'backend/**/*',
        'mobile/**/*',
        'desktop/**/*',
    ],
    extraResources: [
        {
            from: 'public/audio/',
            to: 'audio/',
        },
        {
            from: 'public/icons/',
            to: 'icons/',
        },
    ],
    win: {
        target: 'nsis',
        icon: 'public/icons/hyperai-icon.ico',
    },
    mac: {
        target: 'dmg',
        icon: 'public/icons/hyperai-icon.icns',
    },
    linux: {
        target: 'AppImage',
        icon: 'public/icons/hyperai-icon.png',
    },
    publish: {
        provider: 'github',
        owner: 'your-github-username',
        repo: 'hyperai-user-control-system',
    },
};