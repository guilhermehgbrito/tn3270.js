import { TN3270Field } from '../tn3270-field';
import type { TN3270OrderNode, TN3270Screen } from '../types';

export class StartFieldNode implements TN3270OrderNode {
  readonly data: number[] = [];

  appendData(...data: number[]): void {
    this.data.push(...data);
  }

  execute(screen: TN3270Screen) {
    const field = new TN3270Field({
      data: this.data,
    });

    screen.addField(field);
  }
}
