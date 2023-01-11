import type { EncodedAddress, TN3270OrderNode, TN3270Screen } from '../types';

export class RepeatToAddressNode implements TN3270OrderNode {
  readonly data: number[] = [];

  appendData(...data: number[]): void {
    this.data.push(...data);
  }

  execute(screen: TN3270Screen) {
    const address = screen.decodeAddress(
      this.data.slice(0, 2) as EncodedAddress
    );

    const char = this.data[2];
    const length = screen.distanceInBytes(screen.bufferAddress, address);

    const lastField = screen.getFields()[screen.getFields().length - 1];

    screen.removeField(lastField);

    screen.setBufferAddress(lastField.addressStart);

    lastField.appendData(...Array(length).fill(char), ...this.data.slice(3));

    screen.addField(lastField);
  }
}
