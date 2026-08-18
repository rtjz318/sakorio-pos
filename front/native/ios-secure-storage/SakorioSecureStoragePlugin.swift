import Capacitor
import Foundation
import Security

/**
 * Native iOS secure storage scaffold for Sakorio app-only secrets.
 *
 * Intended use: store the printer-agent token for the XP-80T iPad app worker in
 * iOS Keychain. This file is not compiled by the browser build. Copy/register it
 * into the Capacitor iOS app target when `front/ios/` is generated.
 */
@objc(SakorioSecureStoragePlugin)
public class SakorioSecureStoragePlugin: CAPPlugin {
    private let service = "com.sakorio.pos.secure-storage"

    @objc func get(_ call: CAPPluginCall) {
        guard let key = call.getString("key"), !key.isEmpty else {
            call.reject("key is required")
            return
        }

        var query = baseQuery(key)
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne

        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        if status == errSecItemNotFound {
            call.resolve(["value": NSNull()])
            return
        }
        guard status == errSecSuccess else {
            call.reject("Keychain read failed: \(status)")
            return
        }
        guard let data = item as? Data,
              let value = String(data: data, encoding: .utf8) else {
            call.reject("Keychain value could not be decoded")
            return
        }
        call.resolve(["value": value])
    }

    @objc func set(_ call: CAPPluginCall) {
        guard let key = call.getString("key"), !key.isEmpty else {
            call.reject("key is required")
            return
        }
        guard let value = call.getString("value") else {
            call.reject("value is required")
            return
        }
        guard let data = value.data(using: .utf8) else {
            call.reject("value could not be encoded")
            return
        }

        SecItemDelete(baseQuery(key) as CFDictionary)

        var attributes = baseQuery(key)
        attributes[kSecValueData as String] = data
        attributes[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly

        let status = SecItemAdd(attributes as CFDictionary, nil)
        guard status == errSecSuccess else {
            call.reject("Keychain write failed: \(status)")
            return
        }
        call.resolve()
    }

    @objc func remove(_ call: CAPPluginCall) {
        guard let key = call.getString("key"), !key.isEmpty else {
            call.reject("key is required")
            return
        }
        let status = SecItemDelete(baseQuery(key) as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            call.reject("Keychain remove failed: \(status)")
            return
        }
        call.resolve()
    }

    private func baseQuery(_ key: String) -> [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]
    }
}
