import type { TN3270OrderNode, TN3270Screen } from '../types';

export class InsertCursorNode implements TN3270OrderNode {
  readonly data: number[] = [];

  appendData(...data: number[]): void {
    this.data.push(...data);
  }

  execute(screen: TN3270Screen) {
    screen.setCursorAddress(screen.bufferAddress);
  }
}
