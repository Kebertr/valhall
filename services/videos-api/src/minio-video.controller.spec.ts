import { Test, type TestingModule } from '@nestjs/testing';
import { MinioVideoController } from './minio-video.controller';
import { MinioVideoService } from './minio-video.service';

jest.mock('@valhall/auth', () => ({
  JwtAuthGuard: class {},
}));

describe('MinioVideoController', () => {
  const videoService = {
    getFile: jest.fn(),
    getVideoPlaybackUrl: jest.fn(),
    completeUpload: jest.fn(),
    createUploadPost: jest.fn(),
  };

  let controller: MinioVideoController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MinioVideoController],
      providers: [
        {
          provide: MinioVideoService,
          useValue: videoService,
        },
      ],
    }).compile();

    controller = module.get(MinioVideoController);
  });

  it('gets a file URL by filename', async () => {
    videoService.getFile.mockResolvedValueOnce('https://example.com/file');

    const result = await controller.getFile('proof.mp4');

    expect(videoService.getFile).toHaveBeenCalledWith('proof.mp4');
    expect(result).toBe('https://example.com/file');
  });

  it('gets a playback URL by video ID', async () => {
    const playback = { videoUrl: 'https://example.com/playback' };
    videoService.getVideoPlaybackUrl.mockResolvedValueOnce(playback);

    const result = await controller.getVideoPlaybackUrl('video-1');

    expect(videoService.getVideoPlaybackUrl).toHaveBeenCalledWith('video-1');
    expect(result).toEqual(playback);
  });

  it('completes an upload with the video ID and authorization header', async () => {
    const completed = { id: 'video-1', status: 'UPLOADED' };
    videoService.completeUpload.mockResolvedValueOnce(completed);

    const result = await controller.completeUpload(
      { videoId: 'video-1' },
      'Bearer token',
    );

    expect(videoService.completeUpload).toHaveBeenCalledWith(
      'video-1',
      'Bearer token',
    );
    expect(result).toEqual(completed);
  });

  it('creates an upload URL with body values and authorization header', async () => {
    const upload = {
      videoId: 'video-1',
      postURL: 'https://example.com/upload',
    };
    videoService.createUploadPost.mockResolvedValueOnce(upload);

    const result = await controller.createUploadUrl(
      {
        filename: 'proof.mp4',
        contentType: 'video/mp4',
        sizeBytes: 1234,
      },
      'Bearer token',
    );

    expect(videoService.createUploadPost).toHaveBeenCalledWith(
      'proof.mp4',
      'video/mp4',
      1234,
      'Bearer token',
    );
    expect(result).toEqual(upload);
  });
});
