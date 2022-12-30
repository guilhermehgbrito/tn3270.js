import type { EncodedAddress, TN3270OrderNode, TN3270Screen } from '../types';

export class SetBufferAddressNode implements TN3270OrderNode {
  readonly data: number[] = [];

  appendData(...data: number[]): void {
    this.data.push(...data);
  }

  execute(screen: TN3270Screen) {
    const address = screen.decodeAddress(this.data as EncodedAddress);

    screen.setBufferAddress(address);
  }
}
