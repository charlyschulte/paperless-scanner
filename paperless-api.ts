import fs from "fs";
import fetch from "node-fetch";
import path from "path";
import { settingsManager } from "./settings.js";

export class PaperlessAPI {
  private log: (msg: string) => void;

  constructor(logFunction: (msg: string) => void) {
    this.log = logFunction;
  }

  private async resolveTagIds(tagNames: string[]): Promise<number[]> {
    const settings = settingsManager.get();
    const baseUrl = settings.paperlessApiUrl.replace(/\/$/, '');
    const tagsUrl = `${baseUrl}/api/tags/`;

    // Fetch existing tags
    const response = await fetch(tagsUrl, {
      method: "GET",
      headers: {
        "Authorization": `Token ${settings.paperlessApiToken}`,
        "Accept": "application/json; version=6",
        "User-Agent": "Paperless-Scanner/1.0"
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch tags: HTTP ${response.status}`);
    }

    const tagsData = await response.json() as any;
    const existingTags = tagsData.results || [];
    
    const tagIds: number[] = [];
    
    for (const tagName of tagNames) {
      // Look for existing tag with this name
      const existingTag = existingTags.find((tag: any) => 
        tag.name && tag.name.toLowerCase() === tagName.toLowerCase()
      );
      
      if (existingTag) {
        tagIds.push(existingTag.id);
      } else {
        // Create new tag
        try {
          const createResponse = await fetch(tagsUrl, {
            method: "POST",
            headers: {
              "Authorization": `Token ${settings.paperlessApiToken}`,
              "Accept": "application/json; version=6",
              "Content-Type": "application/json",
              "User-Agent": "Paperless-Scanner/1.0"
            },
            body: JSON.stringify({ name: tagName })
          });

          if (createResponse.ok) {
            const newTag = await createResponse.json() as any;
            tagIds.push(newTag.id);
            this.log(`Created new tag: ${tagName}`);
          } else {
            this.log(`Warning: Could not create tag "${tagName}"`);
          }
        } catch (error) {
          this.log(`Warning: Error creating tag "${tagName}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    return tagIds;
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const settings = settingsManager.get();
      const validation = settingsManager.validate();
      
      if (!validation.valid) {
        return { 
          success: false, 
          error: `Configuration error: ${validation.errors.join(', ')}` 
        };
      }

      const baseUrl = settings.paperlessApiUrl.replace(/\/$/, '');
      const testUrl = `${baseUrl}/api/documents/`;

      this.log("Testing connection to Paperless-ngx...");

      const response = await fetch(testUrl, {
        method: "GET",
        headers: {
          "Authorization": `Token ${settings.paperlessApiToken}`,
          "Accept": "application/json; version=6",
          "User-Agent": "Paperless-Scanner/1.0"
        }
      });

      if (!response.ok) {
        let errorMsg = `HTTP ${response.status}`;
        try {
          const errorText = await response.text();
          if (errorText) {
            errorMsg += `: ${errorText}`;
          }
        } catch (e) {
          // Ignore error parsing response
        }
        
        return { 
          success: false, 
          error: errorMsg 
        };
      }

      // Check if we can parse the response
      const data = await response.json() as any;
      this.log(`Connection successful! Found ${data.count || 0} documents in Paperless-ngx`);
      
      return { success: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.log(`Connection test failed: ${errorMsg}`);
      return { 
        success: false, 
        error: errorMsg 
      };
    }
  }

  async uploadDocument(filePath: string): Promise<void> {
    const settings = settingsManager.get();
    const validation = settingsManager.validate();
    
    if (!validation.valid) {
      throw new Error(`Configuration error: ${validation.errors.join(', ')}`);
    }

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    this.log(`Uploading ${path.basename(filePath)} to Paperless-ngx...`);
    
    // Read the file as a buffer for native FormData
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    
    // Create a Blob from the buffer (Bun supports this)
    const fileBlob = new Blob([fileBuffer], { type: "application/pdf" });
    
    // Use native FormData API
    const form = new FormData();
    form.append("document", fileBlob, fileName);

    // Try to resolve tag IDs if configured
    if (settings.defaultTags && settings.defaultTags.length > 0) {
      try {
        const tagIds = await this.resolveTagIds(settings.defaultTags);
        tagIds.forEach((tagId: number) => {
          form.append("tags", tagId.toString());
        });
        this.log(`Applied ${tagIds.length} tags to document`);
      } catch (tagError) {
        this.log(`Warning: Could not resolve tags, uploading without tags. Error: ${tagError instanceof Error ? tagError.message : 'Unknown error'}`);
        // Continue with upload even if tags fail
      }
    }

    try {
      const response = await fetch(settingsManager.getPaperlessApiEndpoint(), {
        method: "POST",
        headers: {
          "Authorization": `Token ${settings.paperlessApiToken}`,
          "Accept": "application/json; version=6",
          "User-Agent": "Paperless-Scanner/1.0"
        },
        body: form
      });

      if (!response.ok) {
        let errorDetails = `HTTP ${response.status}`;
        try {
          const errorText = await response.text();
          this.log(`API Response: ${errorText}`);
          
          // Try to parse as JSON for more detailed error
          try {
            const errorJson = JSON.parse(errorText);
            if (errorJson.detail) {
              errorDetails += `: ${errorJson.detail}`;
            } else if (errorJson.error) {
              errorDetails += `: ${errorJson.error}`;
            } else {
              errorDetails += `: ${errorText}`;
            }
          } catch {
            errorDetails += `: ${errorText}`;
          }
        } catch (e) {
          // Ignore error parsing response
        }
        
        throw new Error(`Paperless API error: ${errorDetails}`);
      }

      // Parse the response to get the task ID
      const responseData = await response.json() as any;
      
      if (responseData && typeof responseData === 'string') {
        // responseData is a UUID of the consumption task
        this.log(`Upload successful! Task ID: ${responseData}`);
        this.log(`Document queued for processing. Check Paperless-ngx for completion.`);
      } else if (responseData && responseData.task_id) {
        this.log(`Upload successful! Task ID: ${responseData.task_id}`);
        this.log(`Document queued for processing. Check Paperless-ngx for completion.`);
      } else {
        this.log("Upload successful! Document queued for processing.");
      }
      
    } catch (error) {
      throw error;
    }
  }
}