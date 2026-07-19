/**
 * Entry point shared by both platforms (Windows + macOS).
 * The native app shells register "SimpleWebServer" as the root component.
 */
import {AppRegistry} from 'react-native';
import App from './src/App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);
