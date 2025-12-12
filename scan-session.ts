import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { settingsManager } from "./settings.js";

const execAsync = promisify(exec);

export interface ScannedPage {
  filename: string;
  filepath: string;
  timestamp: Date;
  size: number;
}

export class ScanSessionManager {
  private log: (msg: string) => void;

  constructor(logFunction: (msg: string) => void) {
    this.log = logFunction;
  }

  // Get all PDF files in the scan directory
  getScannedPages(): ScannedPage[] {
    const settings = settingsManager.get();
    const scanDir = settings.scanOutputDir;

    if (!fs.existsSync(scanDir)) {
      return [];
    }

    try {
      let files = fs.readdirSync(scanDir)
        .filter(file => file.endsWith('.pdf') && file.startsWith('scan-'))
        .map(filename => {
          const filepath = path.join(scanDir, filename);
          const stats = fs.statSync(filepath);

          // Remove zero-byte files and skip them
          if (stats.size === 0) {
            try {
              fs.unlinkSync(filepath);
              this.log(`Removed zero-byte scan file from directory listing: ${filename}`);
            } catch (e) {
              this.log(`Warning: Could not remove zero-byte file ${filename}: ${e instanceof Error ? e.message : 'Unknown error'}`);
            }
            return null;
          }

          return {
            filename,
            filepath,
            timestamp: stats.mtime,
            size: stats.size
          };
        })
        .filter(f => f !== null) as ScannedPage[];

      files = files.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      return files;
    } catch (error) {
      this.log(`Error reading scan directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return [];
    }
  }

  // Clear all scanned files
  clearScannedPages(): { success: boolean; error?: string; deletedCount: number } {
    const pages = this.getScannedPages();
    let deletedCount = 0;

    try {
      for (const page of pages) {
        try {
          fs.unlinkSync(page.filepath);
          deletedCount++;
        } catch (error) {
          this.log(`Warning: Could not delete ${page.filename}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      this.log(`Cleared ${deletedCount} scanned pages from temporary folder`);
      return { success: true, deletedCount };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        deletedCount 
      };
    }
  }

  // Combine multiple PDF pages into one document
  async combinePages(pageFilenames: string[], outputFilename?: string): Promise<string> {
    const settings = settingsManager.get();
    const scanDir = settings.scanOutputDir;
    
    if (pageFilenames.length === 0) {
      throw new Error('No pages to combine');
    }

    // Validate that all files exist
    const inputPaths = pageFilenames.map(filename => path.join(scanDir, filename));
    for (const inputPath of inputPaths) {
      if (!fs.existsSync(inputPath)) {
        throw new Error(`File not found: ${path.basename(inputPath)}`);
      }
    }

    // Generate output filename if not provided
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const outputFile = outputFilename || `combined-${timestamp}.pdf`;
    const outputPath = path.join(scanDir, outputFile);

    this.log(`Combining ${pageFilenames.length} pages into ${outputFile}...`);

    try {
      // Use pdftk if available, otherwise use ghostscript
      const inputPathsStr = inputPaths.map(p => `"${p}"`).join(' ');
      
      // Try pdftk first (more reliable for PDF combination)
      try {
        const pdftkCmd = `pdftk ${inputPathsStr} cat output "${outputPath}"`;
        await execAsync(pdftkCmd);
        this.log(`Successfully combined pages using pdftk`);
      } catch (pdftkError) {
        // Fallback to ghostscript
        this.log(`pdftk not available, trying ghostscript...`);
        const gsCmd = `gs -dNOPAUSE -sDEVICE=pdfwrite -sOUTPUTFILE="${outputPath}" -dBATCH ${inputPathsStr}`;
        await execAsync(gsCmd);
        this.log(`Successfully combined pages using ghostscript`);
      }

      // Verify the output file was created
      if (!fs.existsSync(outputPath)) {
        throw new Error('Combined PDF was not created');
      }

      return outputPath;
    } catch (error) {
      this.log(`Error combining pages: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new Error(`Failed to combine pages: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Delete specific pages
  deletePages(pageFilenames: string[]): { success: boolean; error?: string; deletedCount: number } {
    const settings = settingsManager.get();
    const scanDir = settings.scanOutputDir;
    let deletedCount = 0;

    try {
      for (const filename of pageFilenames) {
        const filepath = path.join(scanDir, filename);
        try {
          if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
            deletedCount++;
            this.log(`Deleted page: ${filename}`);
          }
        } catch (error) {
          this.log(`Warning: Could not delete ${filename}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return { success: true, deletedCount };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        deletedCount 
      };
    }
  }

  // Get formatted file size
  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
}