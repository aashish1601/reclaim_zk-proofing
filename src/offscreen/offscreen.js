// src/offscreen/offscreen.js

// Import polyfills
import '../utils/polyfills'; 

// Import necessary utilities and interfaces
import { MESSAGE_ACTIONS, MESSAGE_SOURCES, RECLAIM_SESSION_STATUS } from '../utils/constants';
import { updateSessionStatus } from '../utils/fetch-calls';
import { debugLogger, DebugLogType } from '../utils/logger';

// Check if WebAssembly is available
if (typeof WebAssembly === 'undefined') {
   debugLogger.error(DebugLogType.OFFSCREEN, 'WebAssembly is not available in offscreen context.');
} else {
   debugLogger.log(DebugLogType.OFFSCREEN, 'WebAssembly is available in offscreen context.');
}

// Set WASM path for attestor-core if needed
if (typeof globalThis !== 'undefined' && chrome.runtime) {
  globalThis.WASM_PATH = chrome.runtime.getURL(''); 
  debugLogger.log(DebugLogType.OFFSCREEN, `WASM_PATH set to: ${globalThis.WASM_PATH}`);
}

// Ensure window.WebSocket is correctly polyfilled
import { WebSocket as OffscreenWebSocket } from '../utils/offscreen-websocket'; 
if (typeof window !== 'undefined') {
    window.WebSocket = OffscreenWebSocket;
    debugLogger.log(DebugLogType.OFFSCREEN, 'Offscreen: window.WebSocket polyfilled.');
}

class OffscreenProofGenerator {
  constructor() {
    this.isInitialized = false;
    this.currentReclaimInstance = null;
    this.capturedNetworkData = null;
    debugLogger.log(DebugLogType.OFFSCREEN, 'OffscreenProofGenerator: Constructor initialized');
  }

  init() {
    this.isInitialized = true;
    debugLogger.log(DebugLogType.OFFSCREEN, 'OffscreenProofGenerator: Initialized');
  }

  sendReadySignal() {
    try {
      chrome.runtime.sendMessage({
        action: MESSAGE_ACTIONS.OFFSCREEN_DOCUMENT_READY,
        source: MESSAGE_SOURCES.OFFSCREEN,
        target: MESSAGE_SOURCES.BACKGROUND,
        data: { ready: true, timestamp: Date.now() }
      }, (response) => {
        console.log('Offscreen: Sent OFFSCREEN_DOCUMENT_READY signal. Background response:', response);
      });
    } catch (error) {
      console.error('Offscreen: Error sending ready signal:', error);
    }
  }

  async handleMessage(message, sender, sendResponse) {
    const { action, source, target, data } = message;

    console.log('🔧 OFFScreen: Processing message:', { action, source, target });

    // Handle network data from background script
    if (action === MESSAGE_ACTIONS.NETWORK_DATA_FOR_RECLAIM && source === MESSAGE_SOURCES.BACKGROUND && target === MESSAGE_SOURCES.OFFSCREEN) {
      console.log('📡 OFFScreen: Received network data from background script');
      console.log('📊 OFFScreen: Number of filtered requests:', data.filteredRequests?.length || 0);
      console.log('📋 OFFScreen: Provider data available:', !!data.providerData);
      
      // Store the network data for the Reclaim SDK to access
      this.capturedNetworkData = {
        filteredRequests: data.filteredRequests || [],
        providerData: data.providerData,
        sessionId: data.sessionId
      };
      
      // Store claim data if available
      if (data.claimData) {
        console.log('✅ OFFScreen: Received claim data with extracted parameters:', data.claimData.params?.paramValues);
        this.capturedClaimData = data.claimData;
      }
      
      sendResponse({ success: true, message: 'Network data received and stored' });
      return true;
    }

    if (action === MESSAGE_ACTIONS.GENERATE_PROOF && source === MESSAGE_SOURCES.BACKGROUND && target === MESSAGE_SOURCES.OFFSCREEN) {
      try {
        console.log('🔍 OFFScreen: Starting proof generation process...');
        console.log('📋 OFFScreen: Received data:', data);
        
        const { reclaimProofRequestConfig, claimData: passedClaimData, ...otherData } = data;
        
        // Store claim data if passed from background
        if (passedClaimData) {
            console.log('✅ OFFScreen: Received claim data with extracted parameters:', passedClaimData.params?.paramValues);
            this.capturedClaimData = passedClaimData;
        }
        
        // Handle config-based initialization
        if (!reclaimProofRequestConfig) {
          console.log('⚠️ OFFScreen: No config provided in GENERATE_PROOF call');
          
          if (this.currentReclaimInstance) {
            console.log('✅ OFFScreen: Reclaim instance already exists, continuing with existing session');
            sendResponse({ success: true, message: 'Reclaim session already running' });
            return true;
          } else {
            throw new Error('reclaimProofRequestConfig is undefined or null and no existing Reclaim instance found');
          }
        }
        
        if (typeof reclaimProofRequestConfig !== 'string') {
          throw new Error(`reclaimProofRequestConfig is not a string, got: ${typeof reclaimProofRequestConfig}`);
        }
        
        console.log('📋 OFFScreen: Config length:', reclaimProofRequestConfig.length);
        console.log('📋 OFFScreen: Config preview:', reclaimProofRequestConfig.substring(0, 200) + '...');
        console.log('📋 OFFScreen: Config type:', typeof reclaimProofRequestConfig);
        console.log('📋 OFFScreen: Config is empty:', reclaimProofRequestConfig.length === 0);
        
        // Check if we already have a session running
        if (this.currentReclaimInstance) {
          console.log('⚠️ OFFScreen: Reclaim instance already exists, but continuing with new config');
          // Don't skip - continue with the new config to restart the flow
        }
        
        // REAL RECLAIM SDK INTEGRATION
        try {
            console.log('🔄 OFFScreen: Loading real Reclaim SDK...');
            
            // Parse the config to get session information
            let sessionIdForLogging = 'unknown';
            try {
                const configParsed = JSON.parse(reclaimProofRequestConfig);
                sessionIdForLogging = configParsed.sessionId || 'unknown';
                console.log('📋 OFFScreen: Parsed session ID:', sessionIdForLogging);
            } catch (e) { 
                console.warn('⚠️ OFFScreen: Could not parse config JSON:', e.message);
            }
            
            console.log('🔄 OFFScreen: Creating real ReclaimProofRequest from config...');
            
            // Import Reclaim SDK
            let ReclaimProofRequest;
            try {
                const sdkModule = await import('@reclaimprotocol/js-sdk');
                ReclaimProofRequest = sdkModule.ReclaimProofRequest;
                
                if (!ReclaimProofRequest) {
                    throw new Error('ReclaimProofRequest not found in SDK module');
                }
                
                console.log('✅ OFFScreen: Reclaim SDK imported successfully');
            } catch (importError) {
                console.error('❌ OFFScreen: Failed to import Reclaim SDK:', importError);
                throw new Error(`Failed to import Reclaim SDK: ${importError.message}`);
            }
            
            // Create ReclaimProofRequest instance
            let reclaimProofRequest;
            try {
                reclaimProofRequest = await ReclaimProofRequest.fromJsonString(reclaimProofRequestConfig);
                
                if (!reclaimProofRequest) {
                    throw new Error('ReclaimProofRequest.fromJsonString returned null or undefined');
                }
                
                this.currentReclaimInstance = reclaimProofRequest; // Store reference for network data access
                console.log('✅ OFFScreen: Successfully created real ReclaimProofRequest from config');
            } catch (initError) {
                console.error('❌ OFFScreen: Failed to create ReclaimProofRequest:', initError);
                throw new Error(`Failed to create ReclaimProofRequest: ${initError.message}`);
            }
            
            // Step 2: Trigger the verification flow using the real SDK
            console.log('🔄 OFFScreen: Triggering Reclaim flow with triggerReclaimFlow()...');
            try {
                await reclaimProofRequest.triggerReclaimFlow();
                console.log('✅ OFFScreen: Successfully triggered Reclaim flow');
            } catch (triggerError) {
                console.error('❌ OFFScreen: Failed to trigger Reclaim flow:', triggerError);
                throw new Error(`Failed to trigger Reclaim flow: ${triggerError.message}`);
            }
            
            // Step 3: Start the session with real callbacks
            console.log('🔄 OFFScreen: Starting session with startSession()...');
            console.log('📋 OFFScreen: Session started - waiting for user to complete verification on provider website...');
            console.log('📋 OFFScreen: User should: 1) Log in to provider account, 2) Navigate to dashboard, 3) Complete verification');
            
            try {
                await reclaimProofRequest.startSession({
                    onSuccess: async (proofs) => {
                        console.log('🎉 OFFScreen: REAL Reclaim verification SUCCESSFUL!');
                        console.log('📊 OFFScreen: Number of real proofs generated:', proofs.length);
                        console.log('📋 OFFScreen: Real proofs data:', JSON.stringify(proofs, null, 2));
                        
                        // ⭐ MODIFIED: Use WootzApp API for ZK proof generation instead of Reclaim proofs ⭐
                        console.log('🔄 OFFScreen: Converting Reclaim proofs to WootzApp ZK proofs...');
                        
                        try {
                            // Import WootzApp ZK generator
                            const { WootzZKProofGenerator } = await import('../utils/wootz-zk-generator');
                            const wootzGenerator = new WootzZKProofGenerator();
                            
                            // Convert each Reclaim proof to WootzApp ZK proof
                            const wootzProofs = [];
                            for (const proof of proofs) {
                                console.log('🔄 OFFScreen: Converting proof:', proof.identifier);
                                
                                // Create claim data for WootzApp API
                                const claimData = {
                                    name: proof.identifier,
                                    sessionId: sessionIdForLogging,
                                    params: proof.claimData?.params || {},
                                    providerData: this.capturedNetworkData?.providerData || {},
                                    callbackUrl: this.capturedClaimData?.callbackUrl
                                };
                                
                                // Generate ZK proof using WootzApp API
                                const wootzProof = await wootzGenerator.generateProof(claimData, null);
                                wootzProofs.push(wootzProof);
                                
                                console.log('✅ OFFScreen: WootzApp ZK proof generated for:', proof.identifier);
                            }
                            
                            await updateSessionStatus(sessionIdForLogging, RECLAIM_SESSION_STATUS.PROOF_GENERATION_SUCCESS)
                                .catch(e => console.error("❌ OFFScreen: Error updating session status on success:", e));
                            
                            // Send WootzApp proofs to background script
                            chrome.runtime.sendMessage({
                                action: MESSAGE_ACTIONS.GENERATED_PROOF_RESPONSE,
                                source: MESSAGE_SOURCES.OFFSCREEN,
                                target: MESSAGE_SOURCES.BACKGROUND,
                                data: { success: true, proofs: wootzProofs, originalProofs: proofs }
                            }).then(response => console.log('✅ OFFScreen: Sent WootzApp success response to background:', response))
                              .catch(err => console.error('❌ OFFScreen: Error sending success to background:', err));
                            
                        } catch (wootzError) {
                            console.error('❌ OFFScreen: Failed to convert to WootzApp proofs:', wootzError);
                            
                            // Fallback to original Reclaim proofs if WootzApp fails
                            await updateSessionStatus(sessionIdForLogging, RECLAIM_SESSION_STATUS.PROOF_GENERATION_SUCCESS)
                                .catch(e => console.error("❌ OFFScreen: Error updating session status on success:", e));
                            
                            chrome.runtime.sendMessage({
                                action: MESSAGE_ACTIONS.GENERATED_PROOF_RESPONSE,
                                source: MESSAGE_SOURCES.OFFSCREEN,
                                target: MESSAGE_SOURCES.BACKGROUND,
                                data: { success: true, proofs: proofs }
                            }).then(response => console.log('✅ OFFScreen: Sent fallback Reclaim success response to background:', response))
                              .catch(err => console.error('❌ OFFScreen: Error sending success to background:', err));
                        }
                    },
                    onError: async (error) => {
                        console.error('❌ OFFScreen: REAL Reclaim verification FAILED:', error);
                        console.error('❌ OFFScreen: Error details:', error.message || 'Unknown error');
                        console.error('❌ OFFScreen: Error stack:', error.stack);
                        
                        // Check if this is a timeout error and provide better guidance
                        if (error.message && error.message.includes('timeout')) {
                            console.log('⚠️ OFFScreen: Timeout detected - this usually means:');
                            console.log('   1. User needs to log in to the provider website');
                            console.log('   2. User needs to navigate to their profile/dashboard');
                            console.log('   3. Network requests need to be captured by chrome.webRequest');
                            console.log('   4. The Reclaim SDK needs access to the captured data');
                            
                            // Send a more specific error message to help debugging
                            chrome.runtime.sendMessage({
                                action: MESSAGE_ACTIONS.GENERATED_PROOF_RESPONSE,
                                source: MESSAGE_SOURCES.OFFSCREEN,
                                target: MESSAGE_SOURCES.BACKGROUND,
                                data: { 
                                    success: false, 
                                    error: `Reclaim SDK timeout: ${error.message}. User may need to complete login and navigation on provider website.`,
                                    isTimeout: true
                                }
                            }).then(response => console.log('✅ OFFScreen: Sent timeout error response to background:', response))
                              .catch(err => console.error('❌ OFFScreen: Error sending timeout error to background:', err));
                        } else {
                            await updateSessionStatus(sessionIdForLogging, RECLAIM_SESSION_STATUS.PROOF_GENERATION_FAILED)
                                .catch(e => console.error("❌ OFFScreen: Error updating session status on error:", e));
                            
                            chrome.runtime.sendMessage({
                                action: MESSAGE_ACTIONS.GENERATED_PROOF_RESPONSE,
                                source: MESSAGE_SOURCES.OFFSCREEN,
                                target: MESSAGE_SOURCES.BACKGROUND,
                                data: { success: false, error: error.message || 'Unknown Reclaim SDK error' }
                            }).then(response => console.log('✅ OFFScreen: Sent error response to background:', response))
                              .catch(err => console.error('❌ OFFScreen: Error sending error to background:', err));
                        }
                    }
                });
                
                console.log('✅ OFFScreen: Real Reclaim SDK flow initialized successfully');
            } catch (sessionError) {
                console.error('❌ OFFScreen: Failed to start session:', sessionError);
                throw new Error(`Failed to start session: ${sessionError.message}`);
            }
            
        } catch (importError) {
            console.error('❌ OFFScreen: Failed to use real Reclaim SDK:', importError);
            throw new Error(`Failed to use real Reclaim SDK: ${importError.message}`);
        }

        sendResponse({ success: true, message: 'Real Reclaim flow initiated in offscreen. Waiting for user interaction...' });

      } catch (error) {
        console.error('Offscreen: Error in GENERATE_PROOF action:', error);
        chrome.runtime.sendMessage({
          action: MESSAGE_ACTIONS.GENERATED_PROOF_RESPONSE,
          source: MESSAGE_SOURCES.OFFSCREEN,
          target: MESSAGE_SOURCES.BACKGROUND,
          data: { success: false, error: error.message || 'Unknown error during offscreen proof generation' }
        }).catch(err => console.error('Offscreen: Error sending error to background:', err));
        sendResponse({ success: false, error: 'Failed to initiate Reclaim flow in offscreen: ' + error.message });
      }
    }

    // Handle other message types if needed
    if (action === MESSAGE_ACTIONS.NETWORK_DATA && source === MESSAGE_SOURCES.BACKGROUND && target === MESSAGE_SOURCES.OFFSCREEN) {
      try {
        console.log('📡 OFFScreen: Received network data from background');
        console.log('📊 OFFScreen: Network data:', data);
        
        // Store network data if needed for future use
        this.capturedNetworkData = data;
        
        sendResponse({ success: true, message: 'Network data received and stored' });
        return true;
      } catch (error) {
        console.error('Offscreen: Error processing network data:', error);
        sendResponse({ success: false, error: 'Failed to process network data: ' + error.message });
      }
    }

    // Default response for unhandled messages
    sendResponse({ success: false, error: 'Unhandled message action: ' + action });
    return true;
  }
}

// Initialize the offscreen proof generator
const offscreenProofGenerator = new OffscreenProofGenerator();
offscreenProofGenerator.init();

// Send ready signal to background
offscreenProofGenerator.sendReadySignal();

// Set up message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  offscreenProofGenerator.handleMessage(message, sender, sendResponse);
  return true; // Required for async response
});