# 🚀 Wootz API Integration for ZK Proof Generation

## 🎯 **Overview**

This extension now uses the **Wootz API** for local ZK proof generation instead of the Reclaim SDK. This approach provides:

- ✅ **Local Proof Generation**: No external SDK dependencies
- ✅ **Faster Processing**: Direct API calls without timeouts
- ✅ **Better Control**: Full control over proof generation process
- ✅ **Callback Integration**: Automatic proof submission to callback URLs

## 🔧 **How It Works**

### **1. Data Extraction (Same as Before)**
- Network requests are captured and filtered
- Parameters are extracted from responses (e.g., GitHub username)
- Claim objects are created with extracted data

### **2. ZK Proof Generation (New)**
- **Wootz API**: `chrome.wootz.generateZKProof(url, content, callback)`
- **Local Processing**: Proof generated in the browser
- **Structured Output**: Returns `{ proof, verification_key, public_inputs }`

### **3. Proof Submission (New)**
- **Automatic Callback**: Proof sent to specified callback URL
- **Structured Format**: Complete proof object with metadata
- **Error Handling**: Proper error handling and logging

## 📁 **New Files**

### **`src/utils/wootz-zk-generator.js`**
Main ZK proof generation class using Wootz API:

```javascript
export class WootzZKProofGenerator {
  async generateZKProof(claimData, callbackUrl) {
    // Generate ZK proof using Wootz API
    // Send to callback URL
    // Return structured result
  }
}
```

### **`src/utils/wootz-test.js`**
Testing utilities for Wootz API integration:

```javascript
export function testWootzAPI(testUrl, testCallbackUrl) {
  // Test Wootz API functionality
}

export function isWootzAPIAvailable() {
  // Check if Wootz API is available
}
```

## 🔄 **Updated Files**

### **`src/utils/proof-generator/proof-generator.js`**
- **Before**: Used Reclaim SDK via offscreen document
- **After**: Uses Wootz API directly

### **`src/background/background.js`**
- **Before**: Queued proof generation for offscreen processing
- **After**: Direct ZK proof generation with Wootz API

### **`src/content/content.js`**
- **Added**: Enhanced logging for ZK proof generation
- **Added**: Test function `window.testWootzZKProof()`

### **`src/manifest.json`**
- **Added**: `"wootz"` permission for Wootz API access

## 🚀 **Usage**

### **1. Automatic Usage**
The system automatically uses Wootz API when:
- Claim data is created with extracted parameters
- Proof generation is triggered
- Callback URL is available

### **2. Manual Testing**
Test the Wootz API integration:

```javascript
// In browser console
testWootzZKProof()
```

### **3. Verification Flow**
1. **Navigate** to target page (e.g., `https://github.com/settings/profile`)
2. **Start verification** in extension popup
3. **Data extraction** happens automatically
4. **ZK proof generation** using Wootz API
5. **Proof submission** to callback URL
6. **Success confirmation** in popup

## 📊 **Expected Logs**

### **Success Flow:**
```
🚀 Background: Starting ZK proof generation with Wootz API...
[WOOTZ-ZK] Starting ZK proof generation...
[WOOTZ-ZK] Page data extracted
[WOOTZ-ZK] Received proof result from Wootz API
[WOOTZ-ZK] Proof generated successfully
[WOOTZ-ZK] Sending proof to callback URL
[WOOTZ-ZK] Proof sent successfully
✅ Background: ZK proof generation successful!
✅ ZK proof generation successful using Wootz API
```

### **Proof Structure:**
```javascript
{
  proof: {
    a: [...],
    b: [...],
    c: [...],
    // Additional proof fields
  },
  verification_key: {
    alpha: [...],
    beta: [...],
    gamma: [...],
    delta: [...],
    gamma_abc: [...],
    // Additional verification key fields
  },
  public_inputs: {
    // Public inputs for verification
  },
  claim_data: {
    // Original claim data with extracted parameters
  },
  metadata: {
    generated_at: "2025-07-23T04:49:51.035Z",
    url: "https://github.com/settings/profile",
    provider: "GitHub UserName",
    extracted_params: {
      username: "aashish1601"
    }
  }
}
```

## 🔧 **Configuration**

### **Callback URL**
The system uses callback URLs in this order:
1. `claimData.callbackUrl` (if provided)
2. `claimData.providerData.callbackUrl` (if provided)
3. `https://api.reclaimprotocol.org/api/proofs/submit` (default)

### **Timeout Settings**
- **Proof Generation**: 30 seconds
- **Callback Submission**: 10 seconds
- **Overall Process**: 60 seconds

## 🎯 **Benefits**

### **1. Eliminates Reclaim SDK Issues**
- ❌ No more timeout issues
- ❌ No more external SDK dependencies
- ❌ No more complex message passing

### **2. Better Performance**
- ✅ Faster proof generation
- ✅ Direct API access
- ✅ Local processing

### **3. Enhanced Control**
- ✅ Full control over proof format
- ✅ Custom callback handling
- ✅ Better error handling

### **4. Improved Reliability**
- ✅ No external service dependencies
- ✅ Consistent performance
- ✅ Better debugging capabilities

## 🧪 **Testing**

### **1. Test Wootz API Availability**
```javascript
// In browser console
console.log('Wootz API available:', typeof chrome !== 'undefined' && !!chrome.wootz);
console.log('generateZKProof available:', typeof chrome.wootz.generateZKProof === 'function');
```

### **2. Test Proof Generation**
```javascript
// In browser console
testWootzZKProof()
```

### **3. Test Full Flow**
1. Navigate to `https://github.com/settings/profile`
2. Start verification in extension
3. Watch console logs for ZK proof generation
4. Verify proof is sent to callback URL

## 🎉 **Result**

The extension now generates ZK proofs **locally using the Wootz API** and sends them to callback URLs, eliminating all the timeout and dependency issues with the Reclaim SDK! 