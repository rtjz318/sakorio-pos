#import <Capacitor/Capacitor.h>

CAP_PLUGIN(Xp80tPrinterPlugin, "Xp80tPrinter",
  CAP_PLUGIN_METHOD(requestPermissions, CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(scan, CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(connect, CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(disconnect, CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(print, CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(getStatus, CAPPluginReturnPromise);
)
