require('dotenv').config();
const { notarize } = require('electron-notarize');

exports.default = async function notarizing(context) {

  const { electronPlatformName, appOutDir } = context;  
  if (electronPlatformName !== 'darwin') {//will be mas for mac app store
    return;
  }

  const appName = context.packager.appInfo.productFilename;

  console.log("Notarizing...");

  return await notarize({
    appBundleId: 'org.simplewebserver.simplewebserver',
    appPath: `${appOutDir}/${appName}.app`,
    appleId: process.env.APPLEID,
    appleIdPassword: "@keychain:ElectronSigningAppleID",
    teamId: process.env.TEAMID,
    ascProvider: process.env.TEAMID
  });
};