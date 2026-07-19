// pch.reference.h
//
// AppCore.cpp and ConfigStore.cpp `#include "pch.h"`, following React Native
// Windows convention. Your generated app project already has a pch.h; make sure
// it (or the one you use for these files) includes at least the following, then
// add these source files to the app .vcxproj.

#pragma once

#include <winrt/Windows.Foundation.h>
#include <winrt/Windows.Foundation.Collections.h>
#include <winrt/Windows.Data.Json.h>
#include <winrt/Microsoft.ReactNative.h>
#include <winrt/Microsoft.UI.Xaml.h>

#include <CppWinRTIncludes.h>
#include "NativeModules.h"

#include <cmath>
#include <string>
#include <vector>
#include <thread>
#include <chrono>
