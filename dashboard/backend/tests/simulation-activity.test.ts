import { afterEach, describe, expect, it, vi } from 'vitest';
import { Types } from 'mongoose';
import { AcademicService } from '../src/services/academic.service.js';
import { Content, SimulationActivity, Subject } from '../src/models/index.js';
import { ContentStatus, ContentType, UserRole } from '../src/types/academic.types.js';

afterEach(() => vi.restoreAllMocks());

describe('subject scoped DSA simulation learning activity', () => {
  it('records one useful open/completion record and increments the existing view count only on open', async () => {
    const subjectId = new Types.ObjectId();
    const simulationId = new Types.ObjectId();
    const studentId = new Types.ObjectId();
    const activity = { student: studentId, subject: subjectId, simulation: simulationId };
    vi.spyOn(Content, 'findOne').mockResolvedValue({ status: ContentStatus.PUBLISHED } as any);
    const updateActivity = vi.spyOn(SimulationActivity, 'findOneAndUpdate').mockResolvedValue(activity as any);
    const incrementViews = vi.spyOn(Content, 'updateOne').mockResolvedValue({ acknowledged: true } as any);

    await AcademicService.recordSimulationActivity(String(studentId), String(subjectId), String(simulationId), 'OPENED', 'Binary Search');
    await AcademicService.recordSimulationActivity(String(studentId), String(subjectId), String(simulationId), 'COMPLETED', 'Binary Search');

    expect(updateActivity).toHaveBeenCalledTimes(2);
    expect(updateActivity).toHaveBeenNthCalledWith(1,
      { student: String(studentId), subject: String(subjectId), simulation: String(simulationId) },
      expect.objectContaining({ $set: expect.objectContaining({ topic: 'Binary Search' }), $setOnInsert: expect.objectContaining({ firstOpenedAt: expect.any(Date) }) }),
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    expect(updateActivity).toHaveBeenNthCalledWith(2,
      expect.any(Object),
      expect.objectContaining({ $set: expect.objectContaining({ topic: 'Binary Search', completedAt: expect.any(Date) }), $setOnInsert: expect.objectContaining({ firstOpenedAt: expect.any(Date), lastOpenedAt: expect.any(Date) }) }),
      expect.any(Object)
    );
    expect(incrementViews).toHaveBeenCalledTimes(1);
    expect(incrementViews).toHaveBeenCalledWith({ _id: String(simulationId) }, { $inc: { viewCount: 1 } });
  });

  it('rejects completion tracking for unpublished or out-of-subject simulations', async () => {
    const subjectId = new Types.ObjectId();
    const simulationId = new Types.ObjectId();
    const studentId = new Types.ObjectId();
    vi.spyOn(Content, 'findOne').mockResolvedValue({ status: ContentStatus.DRAFT } as any);
    const updateActivity = vi.spyOn(SimulationActivity, 'findOneAndUpdate').mockResolvedValue(null as any);

    await expect(AcademicService.recordSimulationActivity(String(studentId), String(subjectId), String(simulationId), 'COMPLETED'))
      .rejects.toMatchObject({ statusCode: 403 });
    expect(updateActivity).not.toHaveBeenCalled();

    vi.mocked(Content.findOne).mockResolvedValueOnce(null as any);
    await expect(AcademicService.recordSimulationActivity(String(studentId), String(subjectId), String(simulationId), 'OPENED'))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  it('filters student results to published simulations and reports teacher open/completion totals', async () => {
    const subjectId = new Types.ObjectId();
    const simulationId = new Types.ObjectId();
    const subject = { _id: subjectId, subjectName: 'Data Structures and Algorithms', subjectCode: 'IT301', department: { code: 'IT' } };
    const simulation = { _id: simulationId, status: ContentStatus.PUBLISHED, toObject: () => ({ _id: simulationId, status: ContentStatus.PUBLISHED }) };
    vi.spyOn(Subject, 'findById').mockReturnValue({ populate: async () => subject } as any);
    const query = { populate: vi.fn(), sort: vi.fn() } as any;
    query.populate.mockReturnValue(query);
    query.sort.mockResolvedValue([simulation]);
    const findContent = vi.spyOn(Content, 'find').mockReturnValue(query);

    const studentResult = await AcademicService.getSubjectSimulations(String(subjectId), UserRole.STUDENT);
    expect(findContent).toHaveBeenLastCalledWith(expect.objectContaining({ status: ContentStatus.PUBLISHED }));
    expect(studentResult.simulations).toHaveLength(1);

    vi.spyOn(SimulationActivity, 'aggregate').mockResolvedValue([{ _id: simulationId, opened: 4, completed: 2 }] as any);
    const teacherResult = await AcademicService.getSubjectSimulations(String(subjectId), UserRole.TEACHER);
    expect(teacherResult.simulations[0].learningActivity).toEqual({ opened: 4, completed: 2 });
  });
});
