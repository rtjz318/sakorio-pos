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
 */
@objc(Xp80tPrinterPlugin)
public class Xp80tPrinterPlugin: CAPPlugin, CBCentralManagerDelegate, CBPeripheralDelegate {
    private var centralManager: CBCentralManager?
    private var discoveredPeripherals: [String: CBPeripheral] = [:]
    private var connectedPeripheral: CBPeripheral?
    private var writableCharacteristic: CBCharacteristic?
    private var pendingScanCall: CAPPluginCall?
    private var pendingConnectCall: CAPPluginCall?

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
        guard let peripheral = discoveredPeripherals[deviceId] else {
            call.reject("XP-80T printer was not found. Scan again before connecting.")
            return
        }

        pendingConnectCall = call
        peripheral.delegate = self
        centralManager?.connect(peripheral, options: nil)
    }

    @objc func disconnect(_ call: CAPPluginCall) {
        if let peripheral = connectedPeripheral {
            centralManager?.cancelPeripheralConnection(peripheral)
        }
        connectedPeripheral = nil
        writableCharacteristic = nil
        call.resolve()
    }

    @objc func print(_ call: CAPPluginCall) {
        guard let base64 = call.getString("payloadBase64"),
              let data = Data(base64Encoded: base64) else {
            call.reject("payloadBase64 is required")
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
            "deviceName": connectedPeripheral?.name ?? NSNull()
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
            pendingConnectCall?.resolve([
                "connected": true,
                "deviceName": peripheral.name ?? "XP-80T"
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
}
