import { Injectable } from '@nestjs/common';

@Injectable()
export class BongService {
  getHello(): string {
    return 'Hello World!';
  }

  addShot(body: { name: string }) {
    return {
      ok: true,
      message: `Added ${body.name}`,
    };
  }
}
