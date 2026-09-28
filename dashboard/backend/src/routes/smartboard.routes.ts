import { Router } from 'express';
import multer from 'multer';
import { SmartBoardController } from '../controllers/smartboard.controller.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } // 100 MB max PPTX
});

export const smartboardRouter = Router();

smartboardRouter.post('/convert-pptx', upload.single('file'), SmartBoardController.convertPptx);
smartboardRouter.post('/convert-presentation', upload.single('file'), SmartBoardController.convertPptx);
