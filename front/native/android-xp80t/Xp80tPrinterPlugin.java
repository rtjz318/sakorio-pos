package com.sakorio.pos;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Base64;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.OutputStream;
import java.util.Set;
import java.util.UUID;

/**
 * Native Android plugin scaffold for Xprinter XP-80T Bluetooth receipt printing.
 *
 * Android is the preferred launch route for Sakorio Bluetooth-only printing
 * because XP-80T appears as a serial-style Bluetooth printer and Android can
 * use Bluetooth Classic SPP far more directly than iPad Safari/iOS.
 *
 * Expected workflow:
 * 1. Pair XP-80T / Printer001 in Android Bluetooth settings using PIN 0000.
 * 2. Open Sakorio Android app.
 * 3. Settings > Printing scans paired devices.
 * 4. Connect to the paired XP-80T.
 * 5. Sakorio sends ESC/POS receipt bytes to the printer socket.
 */
@CapacitorPlugin(
    name = "Xp80tPrinter",
    permissions = {
        @Permission(
            alias = "bluetooth",
            strings = {
                Manifest.permission.BLUETOOTH_SCAN,
                Manifest.permission.BLUETOOTH_CONNECT
            }
        )
    }
)
public class Xp80tPrinterPlugin extends Plugin {
    private static final UUID SPP_UUID =
        UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");

    private BluetoothAdapter adapter;
    private BluetoothSocket socket;
    private BluetoothDevice connectedDevice;

    @Override
    public void load() {
        adapter = BluetoothAdapter.getDefaultAdapter();
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
            && getPermissionState("bluetooth") != PermissionState.GRANTED) {
            requestAllPermissions(call, "bluetoothPermissionsCallback");
            return;
        }
        resolvePermissionStatus(call);
    }

    @PermissionCallback
    private void bluetoothPermissionsCallback(PluginCall call) {
        resolvePermissionStatus(call);
    }

    private void resolvePermissionStatus(PluginCall call) {
        JSObject result = new JSObject();
        result.put("bluetooth", hasBluetoothConnectPermission() ? "granted" : "prompt");
        call.resolve(result);
    }

    @PluginMethod
    public void scan(PluginCall call) {
        if (adapter == null) {
            call.reject("Bluetooth is not supported on this Android device");
            return;
        }
        if (!adapter.isEnabled()) {
            call.reject("Bluetooth is turned off");
            return;
        }
        if (!hasBluetoothConnectPermission()) {
            call.reject("Bluetooth permission is required");
            return;
        }

        JSArray devices = new JSArray();
        Set<BluetoothDevice> bondedDevices = adapter.getBondedDevices();
        for (BluetoothDevice device : bondedDevices) {
            String name = safeName(device);
            String lower = name.toLowerCase();
            if (lower.contains("printer") || lower.contains("xp") || lower.contains("80")) {
                JSObject item = new JSObject();
                item.put("id", device.getAddress());
                item.put("name", name);
                devices.put(item);
            }
        }

        JSObject result = new JSObject();
        result.put("devices", devices);
        call.resolve(result);
    }

    @PluginMethod
    public void connect(PluginCall call) {
        String deviceId = call.getString("deviceId");
        if (deviceId == null || deviceId.trim().isEmpty()) {
            call.reject("deviceId is required");
            return;
        }
        if (adapter == null) {
            call.reject("Bluetooth is not supported on this Android device");
            return;
        }
        if (!hasBluetoothConnectPermission()) {
            call.reject("Bluetooth permission is required");
            return;
        }

        try {
            disconnectCurrentSocket();
            BluetoothDevice device = adapter.getRemoteDevice(deviceId);
            BluetoothSocket nextSocket = device.createRfcommSocketToServiceRecord(SPP_UUID);
            adapter.cancelDiscovery();
            nextSocket.connect();
            socket = nextSocket;
            connectedDevice = device;

            JSObject result = new JSObject();
            result.put("connected", true);
            result.put("deviceName", safeName(device));
            result.put("transport", "androidBluetoothSpp");
            call.resolve(result);
        } catch (Exception error) {
            disconnectCurrentSocket();
            call.reject("Could not connect to XP-80T printer: " + error.getMessage(), error);
        }
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        disconnectCurrentSocket();
        call.resolve();
    }

    @PluginMethod
    public void print(PluginCall call) {
        String base64 = call.getString("payloadBase64");
        if (base64 == null || base64.trim().isEmpty()) {
            call.reject("payloadBase64 is required");
            return;
        }
        if (socket == null || !socket.isConnected()) {
            call.reject("XP-80T printer is not connected");
            return;
        }

        try {
            byte[] payload = Base64.decode(base64, Base64.DEFAULT);
            OutputStream output = socket.getOutputStream();
            int offset = 0;
            int chunkSize = 512;
            while (offset < payload.length) {
                int count = Math.min(chunkSize, payload.length - offset);
                output.write(payload, offset, count);
                output.flush();
                offset += count;
                Thread.sleep(20);
            }

            JSObject result = new JSObject();
            result.put("printed", true);
            call.resolve(result);
        } catch (Exception error) {
            call.reject("XP-80T print failed: " + error.getMessage(), error);
        }
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject result = new JSObject();
        boolean connected = socket != null && socket.isConnected();
        result.put("connected", connected);
        if (connectedDevice != null) {
            result.put("deviceName", safeName(connectedDevice));
        }
        result.put("transport", connected ? "androidBluetoothSpp" : "notConnected");
        call.resolve(result);
    }

    private boolean hasBluetoothConnectPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            return true;
        }
        return getContext().checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT)
            == PackageManager.PERMISSION_GRANTED;
    }

    private String safeName(BluetoothDevice device) {
        if (!hasBluetoothConnectPermission()) {
            return "Bluetooth printer";
        }
        String name = device.getName();
        return name == null || name.trim().isEmpty() ? "Bluetooth printer" : name;
    }

    private void disconnectCurrentSocket() {
        try {
            if (socket != null) {
                socket.close();
            }
        } catch (Exception ignored) {
            // Closing an already-dropped Bluetooth socket is safe to ignore.
        } finally {
            socket = null;
            connectedDevice = null;
        }
    }
}
