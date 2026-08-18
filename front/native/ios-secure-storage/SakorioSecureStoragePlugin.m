#import <Capacitor/Capacitor.h>

CAP_PLUGIN(SakorioSecureStoragePlugin, "SakorioSecureStorage",
  CAP_PLUGIN_METHOD(get, CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(set, CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(remove, CAPPluginReturnPromise);
)
