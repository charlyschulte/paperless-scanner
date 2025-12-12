import fs from "fs";
import path from "path";

export interface Settings {
  paperlessApiUrl: string;
  paperlessApiToken: string;
  scanOutputDir: string;
  scanResolution: number;
  defaultTags: string[];
  scannerDeviceUrl?: string; // Optional: Direct scanner device URL (e.g., "escl:https://192.168.178.188:443")
}

const DEFAULT_SETTINGS: Settings = {
  paperlessApiUrl: "http://192.168.177.168:8000",
  paperlessApiToken: "",
  scanOutputDir: "/tmp",
  scanResolution: 300,
  defaultTags: ["scanned", "automated"],
  scannerDeviceUrl: "" // Empty means auto-detect
};

const SETTINGS_FILE = path.join(process.cwd(), "config", "config.json");

class SettingsManager {
  private settings: Settings;

  constructor() {
    this.settings = this.loadSettings();
  }

  private loadSettings(): Settings {
    try {
      if (fs.existsSync(SETTINGS_FILE)) {
        const data = fs.readFileSync(SETTINGS_FILE, "utf8");
        const savedSettings = JSON.parse(data);
        return { ...DEFAULT_SETTINGS, ...savedSettings };
      }
    } catch (error) {
      console.warn("Failed to load settings, using defaults:", error);
    }
    return { ...DEFAULT_SETTINGS };
  }

  private saveSettings(): void {
    try {
      // Ensure directory exists before saving (useful when mounting a config directory)
      const dir = path.dirname(SETTINGS_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(this.settings, null, 2));
    } catch (error) {
      console.error("Failed to save settings:", error);
      throw error;
    }
  }

  get(): Settings {
    return { ...this.settings };
  }

  update(newSettings: Partial<Settings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
  }

  reset(): void {
    this.settings = { ...DEFAULT_SETTINGS };
    this.saveSettings();
  }

  // Validate settings
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.settings.paperlessApiUrl) {
      errors.push("Paperless API URL is required");
    } else if (!this.settings.paperlessApiUrl.match(/^https?:\/\/.+/)) {
      errors.push("Paperless API URL must be a valid HTTP/HTTPS URL");
    }

    if (!this.settings.paperlessApiToken) {
      errors.push("Paperless API Token is required");
    }

    if (!this.settings.scanOutputDir) {
      errors.push("Scan output directory is required");
    }

    if (this.settings.scanResolution < 75 || this.settings.scanResolution > 1200) {
      errors.push("Scan resolution must be between 75 and 1200 DPI");
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Get the complete API endpoint URL
  getPaperlessApiEndpoint(): string {
    const baseUrl = this.settings.paperlessApiUrl.replace(/\/$/, '');
    return `${baseUrl}/api/documents/post_document/`;
  }
}

export const settingsManager = new SettingsManager();