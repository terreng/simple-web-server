#include "pch.h"
#include "ConfigStore.h"

using namespace winrt::Windows::Data::Json;
using winrt::Microsoft::ReactNative::JSValue;
using winrt::Microsoft::ReactNative::JSValueArray;
using winrt::Microsoft::ReactNative::JSValueObject;
using winrt::Microsoft::ReactNative::JSValueType;

namespace sws {

static IJsonValue jsValueToJson(const JSValue& v) {
  switch (v.Type()) {
    case JSValueType::Null:
      return JsonValue::CreateNullValue();
    case JSValueType::Boolean:
      return JsonValue::CreateBooleanValue(v.AsBoolean());
    case JSValueType::Int64:
      return JsonValue::CreateNumberValue(static_cast<double>(v.AsInt64()));
    case JSValueType::Double:
      return JsonValue::CreateNumberValue(v.AsDouble());
    case JSValueType::String:
      return JsonValue::CreateStringValue(winrt::to_hstring(v.AsString()));
    case JSValueType::Array: {
      JsonArray arr;
      for (const auto& item : v.AsArray()) {
        arr.Append(jsValueToJson(item));
      }
      return arr;
    }
    case JSValueType::Object: {
      JsonObject obj;
      for (const auto& [key, val] : v.AsObject()) {
        obj.Insert(winrt::to_hstring(key), jsValueToJson(val));
      }
      return obj;
    }
  }
  return JsonValue::CreateNullValue();
}

static JSValue jsonToJSValue(const IJsonValue& v) {
  switch (v.ValueType()) {
    case JsonValueType::Null:
      return JSValue::Null;
    case JsonValueType::Boolean:
      return JSValue(v.GetBoolean());
    case JsonValueType::Number: {
      double d = v.GetNumber();
      double intpart;
      if (std::modf(d, &intpart) == 0.0) {
        return JSValue(static_cast<int64_t>(d));
      }
      return JSValue(d);
    }
    case JsonValueType::String:
      return JSValue(winrt::to_string(v.GetString()));
    case JsonValueType::Array: {
      JSValueArray arr;
      for (const auto& item : v.GetArray()) {
        arr.push_back(jsonToJSValue(item));
      }
      return JSValue(std::move(arr));
    }
    case JsonValueType::Object: {
      JSValueObject obj;
      for (const auto& pair : v.GetObject()) {
        obj[winrt::to_string(pair.Key())] = jsonToJSValue(pair.Value());
      }
      return JSValue(std::move(obj));
    }
  }
  return JSValue::Null;
}

std::wstring ConfigStore::toJson(const JSValueObject& obj) {
  JsonObject root;
  for (const auto& [key, val] : obj) {
    root.Insert(winrt::to_hstring(key), jsValueToJson(val));
  }
  return std::wstring(root.Stringify().c_str());
}

JSValueObject ConfigStore::jsonToJSValueObject(const JsonObject& obj) {
  JSValueObject out;
  for (const auto& pair : obj) {
    out[winrt::to_string(pair.Key())] = jsonToJSValue(pair.Value());
  }
  return out;
}

}  // namespace sws
