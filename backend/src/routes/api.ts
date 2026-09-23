import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as authController from '../controllers/authController.js';
import * as kitController from '../controllers/kitController.js';
import * as regenController from '../controllers/regenerationController.js';
import * as itemController from '../controllers/itemController.js';
import * as practiceController from '../controllers/practiceController.js';

const router = Router();

// 1. Auth Routes
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/logout', authController.logout);
router.get('/auth/me', requireAuth, authController.getMe);

// 2. Kit CRUD & Background Jobs
router.post('/kits', requireAuth, kitController.createKit);
router.get('/kits', requireAuth, kitController.getKits);
router.get('/kits/:id', requireAuth, kitController.getKitById);
router.patch('/kits/:id', requireAuth, kitController.updateKit);
router.delete('/kits/:id', requireAuth, kitController.deleteKit);

// 3. Section-Level Regeneration (Preserving User/Edited/Pinned State)
router.post('/kits/:id/regenerate/company', requireAuth, regenController.regenerateCompanyBriefHandler);
router.post(
  '/kits/:id/regenerate/questions/:category',
  requireAuth,
  regenController.regenerateQuestionsCategoryHandler
);
router.post('/kits/:id/regenerate/schedule', requireAuth, regenController.regenerateScheduleHandler);

// 4. Granular Item Operations (Questions & Flashcards)
router.post('/kits/:id/questions', requireAuth, itemController.addQuestion);
router.patch('/kits/:id/questions/reorder', requireAuth, itemController.reorderQuestions);
router.patch('/kits/:id/questions/:questionId', requireAuth, itemController.updateQuestion);
router.delete('/kits/:id/questions/:questionId', requireAuth, itemController.deleteQuestion);

router.post('/kits/:id/flashcards', requireAuth, itemController.addFlashcard);
router.patch('/kits/:id/flashcards/:flashcardId', requireAuth, itemController.updateFlashcard);
router.delete('/kits/:id/flashcards/:flashcardId', requireAuth, itemController.deleteFlashcard);

// 5. Practice Mode & Weak Spots Report
router.post('/kits/:id/practice/:flashcardId', requireAuth, practiceController.recordPracticeAttempt);
router.get('/kits/:id/practice', requireAuth, practiceController.getPracticeOverview);
router.get('/kits/:id/weak-spots', requireAuth, practiceController.getWeakSpotsReportHandler);

export default router;
