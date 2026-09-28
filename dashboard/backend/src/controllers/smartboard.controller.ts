import { exec } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import type { Request, Response } from 'express';

const execAsync = promisify(exec);

export class SmartBoardController {
  static async convertPptx(req: Request, res: Response): Promise<void> {
    const file = req.file;
    if (!file) {
      res.status(400).json({ success: false, error: 'No presentation file provided.' });
      return;
    }

    const tempDir = path.join(os.tmpdir(), `eduverse_ppt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
    const tempFile = path.join(os.tmpdir(), `upload_${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`);

    try {
      fs.mkdirSync(tempDir, { recursive: true });
      fs.writeFileSync(tempFile, file.buffer);

      const psScript = `
        $ErrorActionPreference = 'Stop'
        $ppt = New-Object -ComObject PowerPoint.Application
        try {
          $pres = $ppt.Presentations.Open('${tempFile.replace(/'/g, "''").replace(/\\/g, '\\\\')}', [Microsoft.Office.Core.MsoTriState]::msoTrue, [Microsoft.Office.Core.MsoTriState]::msoFalse, [Microsoft.Office.Core.MsoTriState]::msoFalse)
          $pres.SaveAs('${tempDir.replace(/'/g, "''").replace(/\\/g, '\\\\')}', 17)
          $pres.Close()
        } finally {
          $ppt.Quit()
          [System.GC]::Collect()
          [System.GC]::WaitForPendingFinalizers()
        }
      `;

      const psFile = path.join(tempDir, 'export.ps1');
      fs.writeFileSync(psFile, psScript);

      await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${psFile}"`, { timeout: 60000 });

      const generatedFiles = fs.readdirSync(tempDir).filter(f => /\.(png|jpe?g)$/i.test(f));
      generatedFiles.sort((a, b) => {
        const matchA = a.match(/\d+/);
        const matchB = b.match(/\d+/);
        const numA = matchA ? parseInt(matchA[0], 10) : 0;
        const numB = matchB ? parseInt(matchB[0], 10) : 0;
        return numA - numB;
      });

      if (generatedFiles.length === 0) {
        res.status(200).json({
          success: false,
          fallback: true,
          error: 'PowerPoint COM produced no slides.'
        });
        return;
      }

      const slides = generatedFiles.map((f, idx) => {
        const fullPath = path.join(tempDir, f);
        const buf = fs.readFileSync(fullPath);
        const mime = f.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
        return {
          index: idx + 1,
          name: `Slide ${idx + 1}`,
          title: `Slide ${idx + 1}`,
          dataUrl: `data:${mime};base64,${buf.toString('base64')}`
        };
      });

      res.status(200).json({
        success: true,
        fileName: file.originalname,
        slideCount: slides.length,
        slides
      });
    } catch (err: any) {
      console.warn('[SmartBoard PPT Converter] Backend conversion fallback:', err?.message || err);
      res.status(200).json({
        success: false,
        fallback: true,
        error: err?.message || 'COM conversion error'
      });
    } finally {
      try { if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile); } catch (_) {}
      try { if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true }); } catch (_) {}
    }
  }
}
