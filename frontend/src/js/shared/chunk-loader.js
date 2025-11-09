/**
 * Chunk Loader Module
 * Handles loading and rendering data in chunks for better performance
 * Displays a loading indicator and progressively renders data
 */

class ChunkLoader {
  constructor(options = {}) {
    this.chunkSize = options.chunkSize || 50; // Number of items per chunk
    this.onChunkLoaded = options.onChunkLoaded || null; // Callback when chunk loads
    this.onAllLoaded = options.onAllLoaded || null; // Callback when all data loaded
    this.onProgress = options.onProgress || null; // Progress callback
    this.onError = options.onError || null; // Error callback
    
    this.isLoading = false;
    this.hasMore = true;
    this.skip = 0;
    this.total = 0;
    this.loadedCount = 0;
    this.allData = [];
    this.loadingIndicator = null;
  }

  /**
   * Show a loading indicator on the page
   */
  showLoadingIndicator() {
    if (!this.loadingIndicator) {
      this.loadingIndicator = document.createElement('div');
      this.loadingIndicator.id = 'chunk-loader-indicator';
      this.loadingIndicator.className = 'chunk-loader-indicator';
      this.loadingIndicator.innerHTML = `
        <div class="loader-overlay">
          <div class="loader-content">
            <div class="spinner"></div>
            <div class="loader-text">
              <div id="loader-progress">Loading...</div>
              <div id="loader-status">Connecting...</div>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" id="loader-bar"></div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(this.loadingIndicator);
      
      // Add styles if not present
      if (!document.getElementById('chunk-loader-styles')) {
        const style = document.createElement('style');
        style.id = 'chunk-loader-styles';
        style.textContent = `
          .chunk-loader-indicator {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .loader-overlay {
            background: rgba(0, 0, 0, 0.8);
            border-radius: 8px;
            padding: 20px 24px;
            text-align: center;
            min-width: 240px;
            max-width: 320px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(8px);
            border: 1px solid rgba(255, 255, 255, 0.1);
          }
          
          .spinner {
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-top: 3px solid #fff;
            border-radius: 50%;
            width: 28px;
            height: 28px;
            animation: spin 1s linear infinite;
            margin: 0 auto 12px;
          }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          .loader-text {
            color: white;
            font-size: 14px;
            margin-bottom: 10px;
          }
          
          #loader-progress {
            font-weight: 600;
            color: #4CAF50;
            font-size: 14px;
            margin-bottom: 4px;
          }
          
          #loader-status {
            font-size: 11px;
            color: rgba(255,255,255,0.7);
            font-weight: 400;
          }
          
          .progress-bar {
            background: rgba(255, 255, 255, 0.15);
            height: 6px;
            border-radius: 3px;
            overflow: hidden;
            margin-top: 10px;
            position: relative;
          }
          
          .progress-fill {
            background: linear-gradient(90deg, #4CAF50, #66BB6A, #4CAF50);
            background-size: 200% 100%;
            height: 100%;
            width: 0%;
            transition: width 0.4s ease-out;
            animation: shimmer 2s infinite;
            border-radius: 3px;
          }
          
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
        `;
        document.head.appendChild(style);
      }
    }
    return this.loadingIndicator;
  }

  /**
   * Update the loading progress indicator
   */
  updateProgress() {
    if (this.loadingIndicator) {
      const progressEl = document.getElementById('loader-progress');
      const barEl = document.getElementById('loader-bar');
      const statusEl = document.getElementById('loader-status');
      
      let percentage = 0;
      let statusText = '';
      let detailText = '';
      
      if (this.total > 0) {
        // Normal progress calculation when total is known
        percentage = Math.min(100, Math.round((this.loadedCount / this.total) * 100));
        statusText = `${percentage}% Complete`;
        detailText = `${this.loadedCount.toLocaleString()} of ${this.total.toLocaleString()} programs loaded`;
      } else if (this.loadedCount > 0) {
        // Show loaded count when total is unknown - use progressive percentage
        const estimatedProgress = Math.min(90, Math.floor(this.loadedCount / 10) * 5 + 10);
        percentage = estimatedProgress;
        statusText = `Loading Programs...`;
        detailText = `${this.loadedCount.toLocaleString()} programs loaded so far`;
      } else {
        // Initial state
        statusText = 'Initializing...';
        detailText = 'Connecting to server...';
        percentage = 5;
      }
      
      if (progressEl) {
        progressEl.textContent = statusText;
      }
      if (statusEl) {
        statusEl.textContent = detailText;
      }
      if (barEl) {
        barEl.style.width = percentage + '%';
      }
      
      console.log(`📊 Progress updated: ${statusText} | ${detailText} | ${percentage}% (${this.loadedCount}/${this.total})`);
    }
  }

  /**
   * Hide the loading indicator
   */
  hideLoadingIndicator() {
    if (this.loadingIndicator) {
      this.loadingIndicator.remove();
      this.loadingIndicator = null;
    }
  }

  /**
   * Load data in chunks from the server
   * @param {string} url - The endpoint URL
   * @returns {Promise} Resolves when all data is loaded
   */
  async loadChunks(url) {
    this.isLoading = true;
    this.hasMore = true;
    this.skip = 0;
    this.loadedCount = 0;
    this.allData = [];
    this.total = 0;

    this.showLoadingIndicator();
    
    // Update initial status
    this.updateProgress(); // Show initial state
    const statusEl = document.getElementById('loader-status');
    if (statusEl) {
      statusEl.textContent = 'Connecting to data server...';
    }

    try {
      // Load all chunks sequentially
      let chunkCount = 0;
      const maxChunks = 100; // Safety limit to prevent infinite loops
      
      while (this.hasMore && chunkCount < maxChunks) {
        chunkCount++;
        console.log(`Starting chunk ${chunkCount} load. hasMore=${this.hasMore}, skip=${this.skip}`);
        await this.loadChunk(url);
        console.log(`Finished chunk ${chunkCount} load. hasMore=${this.hasMore} after load`);
        
        // Exit loop if no more data
        if (!this.hasMore) {
          console.log('No more data, exiting loop');
          break;
        }
        
        // Safety check - if we've loaded all available data, exit
        if (this.loadedCount >= this.total && this.total > 0) {
          console.log('All data loaded (loadedCount >= total), exiting loop');
          this.hasMore = false;
          break;
        }
        
        // Small delay to allow UI to update
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (chunkCount >= maxChunks) {
        console.warn('Max chunks reached, forcing exit');
      }

      console.log(`✅ All chunks loaded! Total chunks: ${chunkCount}, Total items: ${this.loadedCount}`);
      
      // Show completion status briefly before hiding
      const statusEl = document.getElementById('loader-status');
      if (statusEl) {
        statusEl.textContent = `✅ Successfully loaded ${this.loadedCount.toLocaleString()} programs`;
      }
      const progressEl = document.getElementById('loader-progress');
      if (progressEl) {
        progressEl.textContent = '100% Complete';
      }
      const barEl = document.getElementById('loader-bar');
      if (barEl) {
        barEl.style.width = '100%';
      }
      
      // Brief delay to show completion before hiding
      await new Promise(resolve => setTimeout(resolve, 800));
      
      this.isLoading = false;
      console.log('Removing loading indicator...');
      this.hideLoadingIndicator();
      console.log('Loading indicator removed');

      // Call final callback
      if (this.onAllLoaded) {
        console.log('✓ Calling onAllLoaded callback with', this.allData.length, 'items');
        this.onAllLoaded(this.allData);
        console.log('✓ onAllLoaded callback completed');
      } else {
        console.warn('WARNING: onAllLoaded callback not set!');
      }

      return this.allData;
    } catch (error) {
      this.isLoading = false;
      
      // Show error status before hiding
      const statusEl = document.getElementById('loader-status');
      if (statusEl) {
        statusEl.textContent = `❌ Loading failed: ${error.message}`;
      }
      const progressEl = document.getElementById('loader-progress');
      if (progressEl) {
        progressEl.textContent = 'Error - Loading Failed';
      }
      const barEl = document.getElementById('loader-bar');
      if (barEl) {
        barEl.style.background = '#dc3545'; // Red color for error
      }
      
      // Brief delay to show error before hiding
      setTimeout(() => {
        this.hideLoadingIndicator();
      }, 3000);
      
      console.error('Error loading chunks:', error);
      
      if (this.onError) {
        this.onError(error);
      }
      throw error;
    }
  }

  /**
   * Load a single chunk of data
   * @param {string} url - The endpoint URL
   * @returns {Promise} Resolves when chunk is loaded
   */
  async loadChunk(url) {
    try {
      const chunkUrl = `${url}?skip=${this.skip}&limit=${this.chunkSize}`;
      console.log(`📥 Loading chunk: ${chunkUrl}`);

      const response = await fetch(chunkUrl);
      if (!response.ok) {
        throw new Error(`Failed to load chunk: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`📦 Chunk response received:`, result);

      // Normalize various possible response shapes
      let data = [];
      let total = 0;
      let hasMore = false;

      if (Array.isArray(result)) {
        // Static JSON file (entire dataset) or file:// load
        console.log('📋 Response is an array (static JSON)');
        data = result;
        total = result.length;
        hasMore = false;
        
        // For static data, set total immediately and update progress
        if (this.total === 0) {
          this.total = total;
        }
      } else if (result && typeof result === 'object') {
        // API-style response
        console.log('📋 Response is an object (API format)');
        data = Array.isArray(result.data)
          ? result.data
          : (Array.isArray(result.items) ? result.items : []);
        
        // Get total count from various possible fields
        if (typeof result.total === 'number') {
          total = result.total;
        } else if (typeof result.count === 'number') {
          total = result.count;
        } else if (typeof result.totalCount === 'number') {
          total = result.totalCount;
        } else if (typeof result.total_count === 'number') {
          total = result.total_count;
        } else {
          total = Array.isArray(data) ? data.length : 0;
        }
        
        // Set total on first chunk if not already set
        if (this.total === 0 && total > 0) {
          this.total = total;
        }
        
        // Prefer explicit hasMore; otherwise derive from counts
        if (typeof result.hasMore === 'boolean') {
          hasMore = result.hasMore;
        } else if (typeof result.has_more === 'boolean') {
          hasMore = result.has_more;
        } else {
          // Calculate based on current position vs total
          const currentPosition = this.skip + (Array.isArray(data) ? data.length : 0);
          hasMore = currentPosition < (this.total || total);
        }
      }

      console.log(`📊 Chunk parsed: data.length=${data.length}, total=${total}, hasMore=${hasMore}, skip=${this.skip}`);

      // Update total if we got a better value
      if (total > this.total) {
        this.total = total;
      }
      
      // Add new data to our collection
      const newItemCount = Array.isArray(data) ? data.length : 0;
      this.loadedCount += newItemCount;
      if (Array.isArray(data) && data.length) {
        this.allData.push(...data);
      }
      
      console.log(`📈 Progress: ${this.loadedCount}/${this.total} items loaded (${newItemCount} new items this chunk)`);

      // If API signals hasMore but provided no data, stop to avoid infinite loop
      if (hasMore && (!Array.isArray(data) || data.length === 0)) {
        console.warn('Received empty chunk while hasMore=true. Stopping to avoid infinite loop.');
        this.hasMore = false;
      } else {
        this.hasMore = Boolean(hasMore); // Ensure it's a boolean
      }

      // Advance skip by chunk size (or actual received size if less)
      const receivedCount = Array.isArray(data) ? data.length : 0;
      this.skip += receivedCount > 0 ? receivedCount : this.chunkSize;

      console.log(`After update: loadedCount=${this.loadedCount}, total=${this.total}, hasMore=${this.hasMore}`);

      // Update progress display
      this.updateProgress();

      // Call chunk callback for progressive rendering
      if (this.onChunkLoaded) {
        this.onChunkLoaded(data, this.loadedCount, this.total);
      }

      // Call progress callback with detailed info
      if (this.onProgress) {
        const percentage = this.total > 0 ? Math.round((this.loadedCount / this.total) * 100) : 
                          Math.min(90, Math.floor(this.loadedCount / 10) * 5 + 10);
        this.onProgress({
          loaded: this.loadedCount,
          total: this.total,
          percentage: percentage,
          hasMore: this.hasMore,
          chunkSize: newItemCount
        });
      }

      console.log(`Chunk loaded: ${data.length} items (total: ${this.loadedCount}/${this.total}, hasMore=${this.hasMore})`);
    } catch (error) {
      console.error('Error loading chunk:', error);
      throw error;
    }
  }

  /**
   * Load a single item/chunk and render immediately
   * Useful for progressive rendering without waiting for all chunks
   */
  async loadAndRenderChunks(url, renderCallback) {
    this.isLoading = true;
    this.hasMore = true;
    this.skip = 0;
    this.loadedCount = 0;
    this.allData = [];
    this.total = 0;

    this.showLoadingIndicator();

    try {
      let chunkCount = 0;
      const maxChunks = 100; // Safety limit
      
      while (this.hasMore && chunkCount < maxChunks) {
        chunkCount++;
        const chunkUrl = `${url}?skip=${this.skip}&limit=${this.chunkSize}`;
        console.log(`Loading and rendering chunk ${chunkCount}: ${chunkUrl}`);

        const response = await fetch(chunkUrl);
        if (!response.ok) {
          throw new Error(`Failed to load chunk: ${response.statusText}`);
        }

        const result = await response.json();
        // Normalize response
        let data = [];
        let total = 0;
        let hasMore = false;

        if (Array.isArray(result)) {
          data = result;
          total = result.length;
          hasMore = false;
        } else if (result && typeof result === 'object') {
          data = Array.isArray(result.data)
            ? result.data
            : (Array.isArray(result.items) ? result.items : []);
          total = typeof result.total === 'number'
            ? result.total
            : (typeof result.count === 'number' ? result.count : (Array.isArray(data) ? data.length : 0));
          if (typeof result.hasMore === 'boolean') {
            hasMore = result.hasMore;
          } else if (typeof result.has_more === 'boolean') {
            hasMore = result.has_more;
          } else {
            hasMore = this.skip + (Array.isArray(data) ? data.length : 0) < total;
          }
        }

        this.total = total || 0;
        this.loadedCount += Array.isArray(data) ? data.length : 0;
        if (Array.isArray(data) && data.length) {
          this.allData.push(...data);
        }

        if (hasMore && (!Array.isArray(data) || data.length === 0)) {
          console.warn('Received empty chunk while hasMore=true (render mode). Stopping to avoid infinite loop.');
          this.hasMore = false;
        } else {
          this.hasMore = Boolean(hasMore);
        }

        // Advance skip by chunk size (or actual received size if less)
        const receivedCount = Array.isArray(data) ? data.length : 0;
        this.skip += receivedCount > 0 ? receivedCount : this.chunkSize;

        // Update progress
        this.updateProgress();

        // Render immediately
        if (renderCallback) {
          try {
            renderCallback(data, this.loadedCount, this.total);
          } catch (error) {
            console.error('Error in render callback:', error);
          }
        }

        console.log(`Chunk loaded and rendered: ${data.length} items (total: ${this.loadedCount}/${this.total}, hasMore=${this.hasMore})`);

        // Exit if no more data
        if (!this.hasMore) {
          console.log('No more data to render');
          break;
        }

        // Safety check
        if (this.loadedCount >= this.total && this.total > 0) {
          console.log('All data rendered');
          this.hasMore = false;
          break;
        }

        // Small delay between chunks
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (chunkCount >= maxChunks) {
        console.warn('Max chunks reached in renderChunks');
      }

      this.isLoading = false;
      this.hideLoadingIndicator();

      if (this.onAllLoaded) {
        console.log('Calling onAllLoaded from renderChunks');
        this.onAllLoaded(this.allData);
      }

      return this.allData;
    } catch (error) {
      this.isLoading = false;
      this.hideLoadingIndicator();
      console.error('Error loading and rendering chunks:', error);

      if (this.onError) {
        this.onError(error);
      }
      throw error;
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChunkLoader;
}
