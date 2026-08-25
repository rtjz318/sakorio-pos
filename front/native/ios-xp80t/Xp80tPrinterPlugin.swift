import Capacitor
import CoreBluetooth
import Foundation

/**
 * Native iOS plugin skeleton for Xprinter XP-80T Bluetooth receipt printing.
 *
 * This file is intentionally kept outside `front/src` so the current Angular
 * browser build does not depend on Capacitor/iOS packages yet. When the
 * Capacitor iOS project is created, copy this class into the iOS app target and
 * register it with the matching Objective-C bridge file.
 *
 * Implementation direction:
 * 1. Prefer the official Xprinter iOS SDK for XP-80T Bluetooth if available.
 * 2. Keep the JavaScript API below stable for Angular.
 * 3. Use the CoreBluetooth code in this scaffold as the BLE fallback.
 *
 * Why SDK-first:
 * XP-80T documents an iOS POS-app Bluetooth workflow. If the vendor SDK handles
 * Classic/SPP-style printer transport internally, Sakorio should call that SDK
 * rather than trying to emulate generic serial Bluetooth from iOS.
 */
@objc(Xp80tPrinterPlugin)
public class Xp80tPrinterPlugin: CAPPlugin, CBCentralManagerDelegate, CBPeripheralDelegate {
    private enum TransportMode: String {
        case xprinterSdk = "xprinterSdk"
        case coreBluetoothBle = "coreBluetoothBle"
        case notConnected = "notConnected"
    }

    private var centralManager: CBCentralManager?
    private var discoveredPeripherals: [String: CBPeripheral] = [:]
    private var connectedPeripheral: CBPeripheral?
    private var writableCharacteristic: CBCharacteristic?
    private var pendingScanCall: CAPPluginCall?
    private var pendingConnectCall: CAPPluginCall?
    private var activeTransportMode: TransportMode = .notConnected

    public override func load() {
        centralManager = CBCentralManager(delegate: self, queue: DispatchQueue.main)
    }

    @objc func requestPermissions(_ call: CAPPluginCall) {
        // iOS presents Bluetooth permission when CoreBluetooth is first used.
        // Info.plist must include NSBluetoothAlwaysUsageDescription.
        call.resolve([
            "bluetooth": bluetoothState() == "poweredOn" ? "granted" : "prompt"
        ])
    }

    @objc func scan(_ call: CAPPluginCall) {
        if scanWithXprinterSdkIfAvailable(call) {
            return
        }

        guard let centralManager = centralManager else {
            call.reject("Bluetooth manager is not initialized")
            return
        }
        guard centralManager.state == .poweredOn else {
            call.reject("Bluetooth is not powered on")
            return
        }

        discoveredPeripherals.removeAll()
        pendingScanCall = call
        centralManager.scanForPeripherals(withServices: nil, options: [
            CBCentralManagerScanOptionAllowDuplicatesKey: false
        ])

        DispatchQueue.main.asyncAfter(deadline: .now() + 5.0) { [weak self] in
            guard let self = self, self.pendingScanCall === call else { return }
            centralManager.stopScan()
            self.resolveScan(call)
            self.pendingScanCall = nil
        }
    }

    @objc func connect(_ call: CAPPluginCall) {
        guard let deviceId = call.getString("deviceId"), !deviceId.isEmpty else {
            call.reject("deviceId is required")
            return
        }

        if connectWithXprinterSdkIfAvailable(call, deviceId: deviceId) {
            return
        }

        guard let peripheral = discoveredPeripherals[deviceId] else {
            call.reject("XP-80T printer was not found. Scan again before connecting.")
            return
        }

        pendingConnectCall = call
        peripheral.delegate = self
        centralManager?.connect(peripheral, options: nil)
    }

    @objc func disconnect(_ call: CAPPluginCall) {
        if disconnectXprinterSdkIfConnected(call) {
            return
        }

        if let peripheral = connectedPeripheral {
            centralManager?.cancelPeripheralConnection(peripheral)
        }
        connectedPeripheral = nil
        writableCharacteristic = nil
        activeTransportMode = .notConnected
        call.resolve()
    }

    @objc func print(_ call: CAPPluginCall) {
        guard let base64 = call.getString("payloadBase64"),
              let data = Data(base64Encoded: base64) else {
            call.reject("payloadBase64 is required")
            return
        }

        if printWithXprinterSdkIfConnected(call, data: data) {
            return
        }

        guard let peripheral = connectedPeripheral,
              let characteristic = writableCharacteristic else {
            call.reject("XP-80T printer is not connected")
            return
        }

        writeEscPos(data, to: peripheral, characteristic: characteristic)
        call.resolve(["printed": true])
    }

    @objc func getStatus(_ call: CAPPluginCall) {
        call.resolve([
            "connected": connectedPeripheral != nil && writableCharacteristic != nil,
            "deviceName": connectedPeripheral?.name ?? NSNull(),
            "transport": activeTransportMode.rawValue
        ])
    }

    public func centralManagerDidUpdateState(_ central: CBCentralManager) {
        notifyListeners("bluetoothStateChanged", data: [
            "state": bluetoothState()
        ])
    }

    public func centralManager(
        _ central: CBCentralManager,
        didDiscover peripheral: CBPeripheral,
        advertisementData: [String: Any],
        rssi RSSI: NSNumber
    ) {
        let name = peripheral.name
            ?? advertisementData[CBAdvertisementDataLocalNameKey] as? String
            ?? "Bluetooth printer"
        let lowerName = name.lowercased()
        guard lowerName.contains("xp") || lowerName.contains("80") || lowerName.contains("printer") else {
            return
        }
        discoveredPeripherals[peripheral.identifier.uuidString] = peripheral
    }

    public func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        connectedPeripheral = peripheral
        peripheral.delegate = self
        peripheral.discoverServices(nil)
    }

    public func centralManager(
        _ central: CBCentralManager,
        didFailToConnect peripheral: CBPeripheral,
        error: Error?
    ) {
        pendingConnectCall?.reject(error?.localizedDescription ?? "Could not connect to XP-80T printer")
        pendingConnectCall = nil
    }

    public func centralManager(
        _ central: CBCentralManager,
        didDisconnectPeripheral peripheral: CBPeripheral,
        error: Error?
    ) {
        if connectedPeripheral?.identifier == peripheral.identifier {
            connectedPeripheral = nil
            writableCharacteristic = nil
            activeTransportMode = .notConnected
        }
        notifyListeners("printerDisconnected", data: [
            "deviceId": peripheral.identifier.uuidString,
            "error": error?.localizedDescription ?? NSNull()
        ])
    }

    public func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
        if let error = error {
            pendingConnectCall?.reject(error.localizedDescription)
            pendingConnectCall = nil
            return
        }
        peripheral.services?.forEach { service in
            peripheral.discoverCharacteristics(nil, for: service)
        }
    }

    public func peripheral(
        _ peripheral: CBPeripheral,
        didDiscoverCharacteristicsFor service: CBService,
        error: Error?
    ) {
        if let error = error {
            pendingConnectCall?.reject(error.localizedDescription)
            pendingConnectCall = nil
            return
        }
        guard writableCharacteristic == nil else { return }
        if let characteristic = service.characteristics?.first(where: { candidate in
            candidate.properties.contains(.writeWithoutResponse) || candidate.properties.contains(.write)
        }) {
            writableCharacteristic = characteristic
            activeTransportMode = .coreBluetoothBle
            pendingConnectCall?.resolve([
                "connected": true,
                "deviceName": peripheral.name ?? "XP-80T",
                "transport": activeTransportMode.rawValue
            ])
            pendingConnectCall = nil
        }
    }

    private func resolveScan(_ call: CAPPluginCall) {
        let devices = discoveredPeripherals.values.map { peripheral in
            [
                "id": peripheral.identifier.uuidString,
                "name": peripheral.name ?? "Bluetooth printer"
            ]
        }
        call.resolve(["devices": devices])
    }

    private func bluetoothState() -> String {
        switch centralManager?.state {
        case .poweredOn:
            return "poweredOn"
        case .poweredOff:
            return "poweredOff"
        case .unauthorized:
            return "unauthorized"
        case .unsupported:
            return "unsupported"
        case .resetting:
            return "resetting"
        case .unknown, nil:
            return "unknown"
        @unknown default:
            return "unknown"
        }
    }

    private func writeEscPos(_ data: Data, to peripheral: CBPeripheral, characteristic: CBCharacteristic) {
        let maxChunkSize = min(180, max(20, peripheral.maximumWriteValueLength(for: .withoutResponse)))
        var offset = 0
        while offset < data.count {
            let end = min(offset + maxChunkSize, data.count)
            let chunk = data.subdata(in: offset..<end)
            let writeType: CBCharacteristicWriteType = characteristic.properties.contains(.writeWithoutResponse)
                ? .withoutResponse
                : .withResponse
            peripheral.writeValue(chunk, for: characteristic, type: writeType)
            Thread.sleep(forTimeInterval: 0.02)
            offset = end
        }
    }

    /**
     * Xprinter SDK integration seam.
     *
     * Replace these stubs after adding the official Xprinter iOS SDK/framework
     * to the generated Capacitor iOS target. Keep method signatures and
     * JavaScript responses stable so Angular can continue using one printer API.
     */
    private func scanWithXprinterSdkIfAvailable(_ call: CAPPluginCall) -> Bool {
        return false
    }

    private func connectWithXprinterSdkIfAvailable(_ call: CAPPluginCall, deviceId: String) -> Bool {
        return false
    }

    private func disconnectXprinterSdkIfConnected(_ call: CAPPluginCall) -> Bool {
        return false
    }

    private func printWithXprinterSdkIfConnected(_ call: CAPPluginCall, data: Data) -> Bool {
        return false
    }
}
