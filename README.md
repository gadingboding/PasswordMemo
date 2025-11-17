# PasswordMemo

[中文版](./README-CN.md)

## 🔑 A Pure Frontend, Privacy-First Browser Password Manager

PasswordMemo is a lightweight, frontend-only browser extension designed for secure password management. It features custom data templating and supports encrypted synchronization via WebDAV (or similar external storage).

-----

## ✨ Key Features

1.  **True Cross-Platform Access:** As a browser plugin, PasswordMemo offers seamless cross-platform usage across both desktop and mobile devices.
2.  **Zero-Configuration Simplicity:** The operation is intuitive, requires almost no configuration, and eliminates complex backend setup. You can use it instantly right in your browser.
3.  **Flexible Custom Templates:** Beyond standard passwords, you can define custom data templates to securely store anything, such as AI service API keys, long-form notes, and more.
4.  **Absolute User Privacy:** The plugin never touches any user data. All processing and storage are strictly local to your device, ensuring maximum privacy.
5.  **Robust, Elegant Encryption:** Data security is guaranteed through a standard and finely implemented encryption scheme.
6.  **Flexible Storage & Synchronization:** Users leverage their own WebDAV server for synchronization. With WebDAV adapters, this supports integration with various cloud drives like Google Drive and OneDrive. (Future plans include native support for more cloud storage providers and private GitHub repositories.)

-----

## 🛠️ Installation

### Browser Store

The extension is currently in the process of being listed on official browser stores. Installation is not yet available via this method.

### Download from Releases

Download the compiled `zip` file from the Releases page. Since the extension is not yet listed, you may need to activate your browser's **Developer Mode** to install and use it.

### Build from Source

To build the extension yourself:

```bash
git clone https://github.com/gadingboding/PasswordMemo
cd PasswordMemo
pnpm install
pnpm run build
```

The final, unpacked build artifacts will be located in `password-memo-browser/dist`. Please use the **"Load unpacked extension"** option in your browser's Developer Mode to install.

-----

## 🗺️ Road Map

1.  **PassKey Integration:** Implement support for the operating system's PassKey, allowing convenient unlocking via PIN or biometric authentication.
2.  **WebAssembly Encryption:** Migrate the core encryption logic to WebAssembly for enhanced security and performance.
3.  **Improved AI Affinity:** Enhance the plugin to allow non-developers to quickly implement desired functionalities with the help of AI.

-----

## 📜 Legal & Disclaimers

### Data Collection

This extension **collects absolutely no user data**. For complete details, please refer to the [Privacy Statement](./Privacy.md).

### Disclaimer

This extension is a pure frontend utility and does not collect or store any user data. Users must assume all risks associated with the use of this software. The developers of this extension **bear no responsibility** for any data loss, password leakage, or any other damages resulting from poorly managed master passwords, cracked master passwords, synchronization service failures, or any other cause. By using this software, you acknowledge and accept this disclaimer.