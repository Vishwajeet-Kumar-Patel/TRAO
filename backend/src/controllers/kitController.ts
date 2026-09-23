import { Response } from 'express';
import { z } from 'zod';
import { datastore } from '../models/datastore.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { runKitGenerationPipeline } from '../services/pipeline.js';
import { validateInterviewKit } from '@prep-kit/shared';

const CreateKitSchema = z.object({
  jd: z.string().min(10, 'Job description must be at least 10 characters'),
  companyUrl: z.string().min(3, 'Company URL is required'),
  days: z.number().int().min(1).max(60, 'Days until interview must be between 1 and 60'),
});

export async function createKit(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    return;
  }

  const parse = CreateKitSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({
      error: {
        code: 'INVALID_INPUT',
        message: parse.error.issues[0].message,
      },
    });
    return;
  }

  const { jd, companyUrl, days } = parse.data;

  // Create initial record in datastore
  const record = await datastore.createKit(req.user.userId, { jd, companyUrl, days });

  // Respond immediately with kit ID so frontend can poll progress
  res.status(202).json({
    id: record.id,
    status: record.status,
    progress: record.progress,
    message: 'Kit generation started in background',
  });

  // Launch asynchronous background pipeline
  (async () => {
    try {
      await datastore.updateKit(record.id, {
        status: 'running',
        progress: { stage: 'validating', message: 'Starting pipeline execution...', percentage: 5 },
      });

      const kitData = await runKitGenerationPipeline({
        jd,
        companyUrl,
        days,
        onProgress: async (progress) => {
          await datastore.updateKit(record.id, { progress });
        },
      });

      await datastore.updateKit(record.id, {
        status: 'completed',
        kit: kitData,
        progress: { stage: 'completed', message: 'Kit generation complete', percentage: 100 },
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[KitController] Background generation failed for kit ${record.id}:`, errorMsg);
      await datastore.updateKit(record.id, {
        status: 'failed',
        error: errorMsg,
        progress: { stage: 'failed', message: `Generation failed: ${errorMsg}`, percentage: 100 },
      });
    }
  })();
}

export async function getKits(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    return;
  }

  const kits = await datastore.findKitsByUserId(req.user.userId);
  res.status(200).json({ kits });
}

export async function getKitById(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    return;
  }

  const kit = await datastore.findKitById(req.params.id);
  if (!kit) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Interview kit not found' } });
    return;
  }

  if (kit.userId !== req.user.userId) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access to this kit is denied' } });
    return;
  }

  res.status(200).json({ kit });
}

export async function updateKit(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    return;
  }

  const existing = await datastore.findKitById(req.params.id);
  if (!existing) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Interview kit not found' } });
    return;
  }

  if (existing.userId !== req.user.userId) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access to this kit is denied' } });
    return;
  }

  const { kit: updatedKitData } = req.body;
  if (!updatedKitData) {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Kit data is required' } });
    return;
  }

  const validation = validateInterviewKit(updatedKitData);
  if (!validation.success) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Kit does not conform to required schema',
        details: validation.errors,
      },
    });
    return;
  }

  const saved = await datastore.updateKit(req.params.id, { kit: updatedKitData });
  res.status(200).json({ kit: saved });
}

export async function deleteKit(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    return;
  }

  const existing = await datastore.findKitById(req.params.id);
  if (!existing) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Interview kit not found' } });
    return;
  }

  if (existing.userId !== req.user.userId) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access to this kit is denied' } });
    return;
  }

  await datastore.deleteKit(req.params.id);
  res.status(200).json({ message: 'Kit deleted successfully' });
}
