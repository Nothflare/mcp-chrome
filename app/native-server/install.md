# Chrome MCP Bridge Installation Guide

This document details the installation and registration process for Chrome MCP Bridge.

## Installation Process Overview

The installation and registration process for Chrome MCP Bridge is as follows:

```
npm install -g chrome-mcp-bridge
└─ postinstall.js
   ├─ Copy executable to npm_prefix/bin   ← Always writable (user or root)
   ├─ Attempt user-level registration     ← No sudo needed, successful in most cases
   └─ If failed ➜ Prompt user to run chrome-mcp-bridge register --system
      └─ Use sudo-prompt to elevate → Write system-level manifest
```

The flowchart above shows the complete process from global installation to final registration.

## Detailed Installation Steps

### 1. Global Installation

```bash
npm install -g chrome-mcp-bridge
```

After installation, the system will automatically attempt to register the Native Messaging host in the user directory. This does not require administrator privileges and is the recommended installation method.

### 2. User-Level Registration

User-level registration creates a manifest file in the following locations:

```
Manifest Location
├─ User Level (No admin rights needed)
│  ├─ Windows: %APPDATA%\Google\Chrome\NativeMessagingHosts\
│  ├─ macOS:   ~/Library/Application Support/Google/Chrome/NativeMessagingHosts/
│  └─ Linux:   ~/.config/google-chrome/NativeMessagingHosts/
│
└─ System Level (Admin rights needed)
   ├─ Windows: %ProgramFiles%\Google\Chrome\NativeMessagingHosts\
   ├─ macOS:   /Library/Google/Chrome/NativeMessagingHosts/
   └─ Linux:   /etc/opt/chrome/native-messaging-hosts/
```

If automatic registration fails, or you wish to register manually, run:

```bash
chrome-mcp-bridge register
```

### 3. System-Level Registration

If user-level registration fails (e.g., due to permission issues), you can try system-level registration. This requires administrator privileges, but we provide two convenient ways to do this.

Two methods for system-level registration:

#### Method 1: Use `--system` flag (Recommended)

```bash
chrome-mcp-bridge register --system
```

This uses `sudo-prompt` to automatically elevate privileges without manually entering `sudo`.

#### Method 2: Use Administrator Privileges Directly

**Windows**:
Run Command Prompt or PowerShell as Administrator, then execute:

```
chrome-mcp-bridge register
```

**macOS/Linux**:
Use sudo:

```
sudo chrome-mcp-bridge register
```

## Registration Process Details

### Registration Flowchart

```
Registration Process
├─ User-Level Registration (chrome-mcp-bridge register)
│  ├─ Get user-level manifest path
│  ├─ Create user directory
│  ├─ Generate manifest content
│  ├─ Write manifest file
│  └─ Windows: Create user-level registry key
│
└─ System-Level Registration (chrome-mcp-bridge register --system)
   ├─ Check for admin privileges
   │  ├─ Has privileges → Directly create system directory and write manifest
   │  └─ No privileges → Use sudo-prompt to elevate
   │     ├─ Create temporary manifest file
   │     └─ Copy to system directory
   └─ Windows: Create system-level registry key
```

### Manifest File Structure

```
manifest.json
├─ name: "com.chrome-mcp.native-host"
├─ description: "Node.js Host for Browser Bridge Extension"
├─ path: "/path/to/node"              ← Node.js executable path
├─ type: "stdio"                      ← Communication type
├─ allowed_origins: [                 ← Allowed extension IDs
│  "chrome-extension://EXTENSION_ID/"
└─ args: [                            ← Startup arguments
   "/path/to/chrome-mcp-bridge",
   "native"
]
```

### User-Level Registration Flow

1. Determine manifest path
2. Create necessary directories
3. Generate manifest content including:
   - Host name
   - Description
   - Node.js path
   - Communication type (stdio)
   - Allowed extension IDs
   - Startup arguments
4. Write manifest file
5. On Windows, create registry keys

### System-Level Registration Flow

1. Check for existing admin privileges
2. If verified:
   - Create system directories directly
   - Write manifest file
   - Set permissions
   - Create system registry keys (Windows)
3. If not verified:
   - Use `sudo-prompt`
   - Create temp manifest
   - Copy to system directory
   - Create system registry keys (Windows)

## Verify Installation

### Verification Flowchart

```
Verify Installation
├─ Check manifest file
│  ├─ File exists → Check content correctness
│  └─ File missing → Reinstall
│
├─ Check Chrome Extension
│  ├─ Extension installed → Check permissions
│  └─ Extension missing → Install extension
│
└─ Test Connection
   ├─ Success → Installation complete
   └─ Failure → Check error logs → See Troubleshooting
```

### Verification Steps

1. Check if manifest file exists in appropriate directory
   - User level: Check user directory
   - System level: Check system directory
   - Confirm content is correct

2. Install extension in Chrome
   - Ensure installed correctly
   - Ensure `nativeMessaging` permission enabled

3. Test connection via extension
   - Use test function in extension
   - Check Chrome extension logs for errors

## Troubleshooting

### Troubleshooting Flowchart

```
Troubleshooting
├─ Permission Issues
│  ├─ Check user permissions
│  │  ├─ Sufficient → Check directory permissions
│  │  └─ Insufficient → Try system-level installation
│  │
│  ├─ Execution Permission (macOS/Linux)
│  │  ├─ "Permission denied" error
│  │  ├─ "Native host has exited" error
│  │  └─ Run chrome-mcp-bridge fix-permissions
│  │
│  └─ Try chrome-mcp-bridge register --system
│
├─ Path Issues
│  ├─ Check Node.js (node -v)
│  └─ Check global NPM path (npm root -g)
│
├─ Registry Issues (Windows)
│  ├─ Check registry access
│  └─ Try creating registry keys manually
│
└─ Other Issues
   ├─ Check console errors
   └─ Submit Issue to GitHub
```

### Common Resolutions

1. Ensure Node.js is installed correctly
   - Run `node -v` and `npm -v`
   - Ensure Node.js version >= 14.x

2. Check file/directory creation permissions
   - User level needs user directory write access
   - System level needs admin/root access

3. **Fix Execution Permissions**

   **macOS/Linux**:

   **Symptoms**: "Permission denied" or "Native host has exited"

   **Solution**:

   a) **Use built-in fix command (Recommended)**:

   ```bash
   chrome-mcp-bridge fix-permissions
   ```

   b) **Manual set permissions**:

   ```bash
   chmod +x /path/to/node_modules/chrome-mcp-bridge/run_host.sh
   chmod +x /path/to/node_modules/chrome-mcp-bridge/index.js
   chmod +x /path/to/node_modules/chrome-mcp-bridge/cli.js
   ```

   **Windows**:

   **Symptoms**: "Access denied" or file not executable

   **Solution**:

   a) **Use built-in fix command**:

   ```cmd
   chrome-mcp-bridge fix-permissions
   ```

   b) **Check file properties**: Ensure files are not read-only.

   c) **Reinstall**:
   
   ```bash
   npm uninstall -g chrome-mcp-bridge
   npm install -g chrome-mcp-bridge
   chrome-mcp-bridge fix-permissions
   ```

4. On Windows, check registry access (`HKCU` or `HKLM`)

5. Try system-level installation (`--system`)

6. Check console logs (`--verbose` for more info)

If issues persist, submit an issue with:
- OS version
- Node.js version
- Installation command
- Error message
- Steps tried
