/**
 * Copyright 2018-2025 bluefox <dogafox@gmail.com>
 *
 * MIT License
 *
 */
const { deleteFoldersRecursive, buildReact, npmInstall, copyFiles, patchHtmlFile } = require('@iobroker/build-tools');
const { copyFileSync, existsSync } = require('node:fs');
const fs = require('node:fs');

function buildAdmin() {
    return buildReact(`${__dirname}/src-admin/`, { rootDir: `${__dirname}/src-admin/`, vite: true });
}
function cleanAdmin() {
    deleteFoldersRecursive(`${__dirname}/admin/custom`);
    deleteFoldersRecursive(`${__dirname}/src-admin/build`);
}
function copyAllAdminFiles() {
    copyFiles(['src-admin/build/assets/*.css', '!src-admin/build/assets/src_bootstrap_*.css'], 'admin/assets');
    copyFiles(['src-admin/build/assets/*.js'], 'admin/assets');
    copyFiles(['src-admin/build/assets/*.map'], 'admin/assets');
    //copyFiles(['src-admin/build/static/js/*.map', '!src-admin/build/static/js/vendors*.map', '!src-admin/build/static/js/node_modules*.map'], 'admin/custom/static/js');
    copyFiles(['src-admin/build/assets/*.png'], 'admin/assets');
    copyFiles(['src-admin/build/customComponents.js'], 'admin/custom');
    //copyFiles(['src-admin/build/customComponents.js.map'], 'admin/custom');
    copyFiles(['src-admin/src/i18n/*.json'], 'admin/i18n');
}
async function copyAllFiles() {
    copyFiles(
        [
            'src-admin/build/**/*',
            '!src-admin/build/index.html',
            'admin-config/*',
            '!src-admin/build/vendor/socket.io.js',
        ],
        'admin/',
    );

    //await patchHtmlFile(`${__dirname}/src-admin/build/index.html`);
    copyFileSync(`${__dirname}/src-admin/build/index.html`, `${__dirname}/admin/index_m.html`);
    copyFileSync(`${__dirname}/src-admin/build/index.html`, `${__dirname}/admin/tab_m.html`);
}
function patchFiles() {
    if (fs.existsSync(`${__dirname}/src/build/index.html`)) {
        let code = fs.readFileSync(`${__dirname}/src/build/index.html`).toString('utf8');
        code = code.replace(/<script>var script=document\.createElement\("script"\)[^<]+<\/script>/,
            `<script type="text/javascript" src="./../../lib/js/socket.io.js"></script>`);

        fs.existsSync(`${__dirname}/admin/tab_m.html`) && fs.unlinkSync(`${__dirname}/admin/tab_m.html`);
        fs.writeFileSync(`${__dirname}/admin/tab_m.html`, code);
    }
}
function clean() {
    deleteFoldersRecursive(`${__dirname}/src-admin/build`);
    deleteFoldersRecursive(`${__dirname}/admin`, [
        'med-plan.png',
        '.json',
        '.json5',
        'custom',
        'adapter-settings.js',
        'med-plan.svg',
        'index.html',
        'index_m.html',
        'index_m.js',
        'style.css',
        'tab_m.css',
        'tab_m.html',
        'tab_m.js',
        'words.js',
        'translations.json',
        'i18n',
        'assets',
    ]);
}

if (process.argv.includes('--admin-0-clean')) {
    cleanAdmin();
} else if (process.argv.includes('--admin-1-npm')) {
    npmInstall(`${__dirname}/src-admin/`)
        .catch(e => console.error(e));
} else if (process.argv.includes('--admin-2-compile')) {
    buildAdmin()
        .catch(e => console.error(e));
} else if (process.argv.includes('--admin-3-copy')) {
    copyAllAdminFiles();
} else if (process.argv.includes('--admin-build')) {
    cleanAdmin();
    npmInstall(`${__dirname}/src-admin/`)
        .then(() => buildAdmin())
        .then(() => copyAllAdminFiles())
        .catch(e => console.error(e));
} else if (process.argv.includes('--0-clean')) {
    clean();
} else if (process.argv.includes('--1-npm')) {
    if (!existsSync(`${__dirname}/src-admin/node_modules`)) {
        npmInstall(`${__dirname}/src-admin`).catch(e => {
            console.error(`Cannot run npm: ${e}`);
            process.exit(2);
        });
    }
} else if (process.argv.includes('--2-build')) {
    buildReact(`${__dirname}/src-admin`, { rootDir: `${__dirname}/src-admin`, tsc: true, vite: true }).catch(e => {
        console.error(`Cannot build: ${e}`);
        process.exit(2);
    });
} else if (process.argv.includes('--3-copy')) {
    copyAllFiles().catch(e => {
        console.error(`Cannot copy: ${e}`);
        process.exit(2);
    });
} else if (process.argv.includes('--build-admin')) {
    clean();
    npmInstall(`${__dirname}/src-admin`)
        .then(() => buildReact(`${__dirname}/src-admin`, { rootDir: `${__dirname}/src-admin`, tsc: true, vite: true }))
        .then(() => copyAllFiles());
} else {
    cleanAdmin();
    npmInstall(`${__dirname}/src-admin/`)
        .then(() => buildAdmin())
        .then(() => copyAllAdminFiles())
        .then(() => copyAllFiles())
        .then(() => patchFiles())
        .then(() => clean())
        .then(() => {
            if (!fs.existsSync(`${__dirname}/src/node_modules`)) {
                return npmInstall(`${__dirname}/src/`);
            }
        })
        .then(() => buildReact(`${__dirname}/src/`, { rootDir: __dirname, vite: true, tsc: true }))
        .then(() => copyAllFiles())
        .then(() => patchFiles())
        .catch(e => console.error(e));
}
