const { notarize } = require('@electron/notarize');

exports.default = async function notarizing(context) {

    const { electronPlatformName, appOutDir } = context;
    //will be mas for mac app store
    if (electronPlatformName !== 'darwin') return;

    const appName = context.packager.appInfo.productFilename;

    console.log("Notarizing...");

    return await notarize({
        tool: "notarytool",
        appPath: `${appOutDir}/${appName}.app`,
        keychainProfile: "SWS_Electron_Signing"
    });

    // xcrun notarytool store-credentials "SWS_Electron_Signing" --apple-id "email@example.com" --team-id "RXXXXXXXXX" --password "foos-bars-bazz-bang"
};
