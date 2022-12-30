import { TN3270MessageHeader } from './types';
import { randomUUID } from 'node:crypto';

export class TN3270Message {
  readonly id: string = randomUUID();
  readonly header = {} as TN3270MessageHeader;
  readonly data: number[] = [];
  private complete = false;

  public pushByte(byte: number): void {
    this.data.push(byte);
  }

  public parseHeader(): void {
    const HEADER_LENGTH = 5;
    const header = this.data.splice(0, HEADER_LENGTH);

    this.header.dataType = header[0];
    this.header.responseFlag = header[2];
    this.header.sequenceNumber = Buffer.from(header.slice(3, 5)).readUInt16LE();
  }

  public toJSON() {
    return {
      header: this.header,
      data: this.data,
    };
  }

  public setAsComplete(): void {
    this.complete = true;
  }

  public isComplete(): boolean {
    return this.complete;
  }
}
